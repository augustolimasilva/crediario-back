import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Compra } from './compra.entity';
import { CompraItem } from './compra-item.entity';
import { CompraPagamento, FormaPagamento, StatusPagamento } from './compra-pagamento.entity';
import { Estoque, TipoMovimentacao } from './estoque.entity';
import { Produto } from '../produto/produto.entity';
import { User } from '../user/user.entity';

interface CompraItemInput {
  produtoId: string;
  quantidade: number;
  valorUnitario: number;
}

interface CompraPagamentoInput {
  formaPagamento: FormaPagamento;
  valor: number;
  dataVencimento: Date;
  dataPagamento?: Date;
  observacao?: string;
}

@Injectable()
export class CompraService {
  constructor(
    @InjectRepository(Compra)
    private compraRepository: Repository<Compra>,
    @InjectRepository(CompraItem)
    private compraItemRepository: Repository<CompraItem>,
    @InjectRepository(CompraPagamento)
    private compraPagamentoRepository: Repository<CompraPagamento>,
    @InjectRepository(Estoque)
    private estoqueRepository: Repository<Estoque>,
    @InjectRepository(Produto)
    private produtoRepository: Repository<Produto>,
    private dataSource: DataSource,
  ) {}

  async findAll(): Promise<Compra[]> {
    return this.compraRepository.find({
      relations: ['itens', 'itens.produto', 'usuario', 'pagamentos'],
      order: { dataCompra: 'DESC' },
    });
  }

  async findById(id: string): Promise<Compra | null> {
    return this.compraRepository.findOne({
      where: { id },
      relations: ['itens', 'itens.produto', 'usuario', 'pagamentos'],
    });
  }

  async create(compraData: {
    nomeFornecedor: string;
    dataCompra: Date;
    usuarioId: string;
    observacao?: string;
    itens: CompraItemInput[];
    pagamentos: CompraPagamentoInput[];
  }): Promise<Compra> {
    // Usar transaction para garantir consistência
    return this.dataSource.transaction(async (manager) => {
      // Validar se o usuário existe
      const usuario = await manager.findOne(User, {
        where: { id: compraData.usuarioId },
      });

      if (!usuario) {
        throw new NotFoundException(`Usuário com ID ${compraData.usuarioId} não encontrado. Faça login novamente.`);
      }

      // Validar se há pelo menos um pagamento
      if (!compraData.pagamentos || compraData.pagamentos.length === 0) {
        throw new BadRequestException('É necessário informar pelo menos uma forma de pagamento');
      }

      // Calcular valor total dos itens
      let valorTotalItens = 0;
      const itensProcessados: Array<{
        produtoId: string;
        quantidade: number;
        valorUnitario: number;
        valorTotal: number;
      }> = [];

      for (const item of compraData.itens) {
        // Validar se produto existe
        const produto = await manager.findOne(Produto, {
          where: { id: item.produtoId },
        });

        if (!produto) {
          throw new NotFoundException(`Produto ${item.produtoId} não encontrado`);
        }

        const valorTotalItem = item.quantidade * item.valorUnitario;
        valorTotalItens += valorTotalItem;

        itensProcessados.push({
          produtoId: item.produtoId,
          quantidade: item.quantidade,
          valorUnitario: item.valorUnitario,
          valorTotal: valorTotalItem,
        });
      }

      // Calcular valor total dos pagamentos
      const valorTotalPagamentos = compraData.pagamentos.reduce(
        (total, pag) => total + Number(pag.valor),
        0
      );

      // Validar se o valor dos pagamentos é igual ao valor dos itens
      if (Math.abs(valorTotalPagamentos - valorTotalItens) > 0.01) {
        throw new BadRequestException(
          `O valor total dos pagamentos (R$ ${valorTotalPagamentos.toFixed(2)}) deve ser igual ao valor total da compra (R$ ${valorTotalItens.toFixed(2)})`
        );
      }

      // Criar a compra
      const compra = manager.create(Compra, {
        nomeFornecedor: compraData.nomeFornecedor,
        valorTotal: valorTotalItens,
        dataCompra: compraData.dataCompra,
        usuarioId: compraData.usuarioId,
        observacao: compraData.observacao,
      });

      const compraSalva = await manager.save(Compra, compra);

      // Criar os itens da compra
      for (const itemData of itensProcessados) {
        const item = manager.create(CompraItem, {
          compraId: compraSalva.id,
          ...itemData,
        });
        await manager.save(CompraItem, item);

        // Criar entrada no estoque
        const estoque = manager.create(Estoque, {
          produtoId: itemData.produtoId,
          quantidade: itemData.quantidade,
          tipoMovimentacao: TipoMovimentacao.ENTRADA,
          valorUnitario: itemData.valorUnitario,
          dataMovimentacao: compraData.dataCompra,
          compraId: compraSalva.id,
          usuarioId: compraData.usuarioId,
          observacao: `Entrada via compra - Fornecedor: ${compraData.nomeFornecedor}`,
        });
        await manager.save(Estoque, estoque);
      }

      // Criar os pagamentos da compra
      for (const pagamentoData of compraData.pagamentos) {
        const status = pagamentoData.dataPagamento 
          ? StatusPagamento.PAGO 
          : StatusPagamento.PENDENTE;

        const pagamento = manager.create(CompraPagamento, {
          compraId: compraSalva.id,
          formaPagamento: pagamentoData.formaPagamento,
          valor: pagamentoData.valor,
          dataVencimento: pagamentoData.dataVencimento,
          dataPagamento: pagamentoData.dataPagamento,
          status,
          observacao: pagamentoData.observacao,
        });
        await manager.save(CompraPagamento, pagamento);
      }

      // Buscar e retornar a compra completa
      const compraCompleta = await manager.findOne(Compra, {
        where: { id: compraSalva.id },
        relations: ['itens', 'itens.produto', 'usuario', 'pagamentos'],
      });

      if (!compraCompleta) {
        throw new Error('Erro ao buscar compra criada');
      }

      return compraCompleta;
    });
  }

  async delete(id: string): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      // Verificar se a compra existe
      const compra = await manager.findOne(Compra, { where: { id } });
      if (!compra) {
        throw new NotFoundException('Compra não encontrada');
      }

      // Deletar os registros de estoque relacionados
      await manager.delete(Estoque, { compraId: id });

      // Deletar a compra (os itens serão deletados automaticamente devido ao cascade)
      await manager.delete(Compra, { id });
    });
  }

  async getEstoque(): Promise<any[]> {
    // Buscar todas as movimentações de estoque agrupadas por produto
    const movimentacoes = await this.estoqueRepository.find({
      relations: ['produto', 'usuario'],
      order: { dataMovimentacao: 'DESC' },
    });

    // Calcular saldo por produto
    const saldoPorProduto = new Map<string, any>();

    for (const mov of movimentacoes) {
      if (!saldoPorProduto.has(mov.produtoId)) {
        saldoPorProduto.set(mov.produtoId, {
          produto: mov.produto,
          quantidadeTotal: 0,
          ultimaMovimentacao: mov.dataMovimentacao,
          movimentacoes: [],
        });
      }

      const saldo = saldoPorProduto.get(mov.produtoId);
      
      if (mov.tipoMovimentacao === TipoMovimentacao.ENTRADA) {
        saldo.quantidadeTotal += mov.quantidade;
      } else if (mov.tipoMovimentacao === TipoMovimentacao.SAIDA) {
        saldo.quantidadeTotal -= mov.quantidade;
      }

      saldo.movimentacoes.push(mov);
    }

    return Array.from(saldoPorProduto.values());
  }

  async getEstoquePorProduto(produtoId: string): Promise<any> {
    const movimentacoes = await this.estoqueRepository.find({
      where: { produtoId },
      relations: ['produto', 'usuario', 'compra'],
      order: { dataMovimentacao: 'DESC' },
    });

    let quantidadeTotal = 0;

    for (const mov of movimentacoes) {
      if (mov.tipoMovimentacao === TipoMovimentacao.ENTRADA) {
        quantidadeTotal += mov.quantidade;
      } else if (mov.tipoMovimentacao === TipoMovimentacao.SAIDA) {
        quantidadeTotal -= mov.quantidade;
      }
    }

    return {
      produtoId,
      produto: movimentacoes[0]?.produto,
      quantidadeTotal,
      movimentacoes,
    };
  }
}

