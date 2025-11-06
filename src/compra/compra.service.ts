import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Compra } from './compra.entity';
import { CompraItem } from './compra-item.entity';
import { CompraPagamento, FormaPagamento, StatusPagamento } from './compra-pagamento.entity';
import { Estoque, TipoMovimentacao } from './estoque.entity';
import { LancamentoFinanceiro, TipoLancamento } from './lancamento-financeiro.entity';
import { Produto } from '../produto/produto.entity';
import { User } from '../user/user.entity';
import { ProdutoHistoricoService } from '../produto/produto-historico.service';
import { TipoAlteracao } from '../produto/produto-historico.entity';

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
  quantidadeParcelas?: number;
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
    @InjectRepository(LancamentoFinanceiro)
    private lancamentoFinanceiroRepository: Repository<LancamentoFinanceiro>,
    @InjectRepository(Produto)
    private produtoRepository: Repository<Produto>,
    private dataSource: DataSource,
    private readonly produtoHistoricoService: ProdutoHistoricoService,
  ) {}

  private gerarDatasParcelas(dataVencimento: Date, quantidadeParcelas: number): Date[] {
    const datas: Date[] = [];
    const dataBase = new Date(dataVencimento);
    dataBase.setHours(0, 0, 0, 0); // Normalizar para meia-noite local
    
    // Armazenar o dia original para manter consistência
    const diaOriginal = dataBase.getDate();
    
    for (let i = 0; i < quantidadeParcelas; i++) {
      const ano = dataBase.getFullYear();
      const mes = dataBase.getMonth() + i;
      
      // Calcular o ano e mês corretos (lidar com overflow de meses)
      const anoFinal = ano + Math.floor(mes / 12);
      const mesFinal = mes % 12;
      
      // Criar data com o primeiro dia do mês
      const dataParcela = new Date(anoFinal, mesFinal, 1);
      dataParcela.setHours(0, 0, 0, 0);
      
      // Obter o último dia do mês
      const ultimoDiaDoMes = new Date(anoFinal, mesFinal + 1, 0).getDate();
      
      // Usar o dia original ou o último dia do mês, o que for menor
      const diaFinal = Math.min(diaOriginal, ultimoDiaDoMes);
      dataParcela.setDate(diaFinal);
      dataParcela.setHours(0, 0, 0, 0); // Garantir que está normalizada
      
      datas.push(dataParcela);
    }
    
    return datas;
  }

  async findAll(page: number = 1, pageSize: number = 20): Promise<{ data: Compra[]; total: number; page: number; pageSize: number }> {
    const take = Math.max(1, Math.min(pageSize, 200));
    const skip = Math.max(0, (Math.max(1, page) - 1) * take);

    const [data, total] = await this.compraRepository.findAndCount({
      relations: ['itens', 'itens.produto', 'usuario', 'pagamentos'],
      order: { dataCompra: 'DESC' },
      skip,
      take,
    });

    return { data, total, page: Math.max(1, page), pageSize: take };
  }

  async findById(id: string): Promise<Compra | null> {
    const compra = await this.compraRepository.findOne({
      where: { id },
      relations: ['itens', 'itens.produto', 'usuario', 'pagamentos'],
    });

    if (!compra) {
      return null;
    }

    const lancamentos = await this.lancamentoFinanceiroRepository.find({
      where: { compraId: id },
      order: { dataLancamento: 'DESC' },
    });

    (compra as any).lancamentosFinanceiros = lancamentos;
    return compra;
  }

  async create(compraData: {
    nomeFornecedor: string;
    dataCompra: Date;
    usuarioId: string;
    observacao?: string;
    desconto?: number;
    itens: CompraItemInput[];
    pagamentos: CompraPagamentoInput[];
  }): Promise<Compra> {
    // Usar transaction para garantir consistência
    return this.dataSource.transaction(async (manager) => {
      // Normalizar dataCompra para evitar problemas de timezone
      const dataCompraNormalizada = new Date(compraData.dataCompra);
      dataCompraNormalizada.setHours(0, 0, 0, 0);
      
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

      // Calcular desconto (default 0)
      const desconto = Number(compraData.desconto || 0);
      
      // Calcular valor total após desconto
      const valorTotal = Math.max(0, valorTotalItens - desconto);

      // Calcular valor total dos pagamentos
      const valorTotalPagamentos = compraData.pagamentos.reduce(
        (total, pag) => total + Number(pag.valor),
        0
      );

      // Validar se o valor dos pagamentos é igual ao valor total (após desconto)
      if (Math.abs(valorTotalPagamentos - valorTotal) > 0.01) {
        throw new BadRequestException(
          `O valor total dos pagamentos (R$ ${valorTotalPagamentos.toFixed(2)}) deve ser igual ao valor total da compra (R$ ${valorTotal.toFixed(2)})`
        );
      }

      // Criar a compra
      const compra = manager.create(Compra, {
        nomeFornecedor: compraData.nomeFornecedor,
        valorTotal,
        desconto,
        dataCompra: dataCompraNormalizada,
        usuarioId: compraData.usuarioId,
        observacao: compraData.observacao,
      });

      const compraSalva = await manager.save(Compra, compra);

      // Criar os itens da compra
      for (const itemData of itensProcessados) {
        // Buscar produto atual para possível cálculo de custo médio ponderado
        const produtoAtual = await manager.findOne(Produto, { where: { id: itemData.produtoId } });

        // Calcular e atualizar preço médio apenas se o produto tiver controle de estoque ativo
        if (produtoAtual?.temEstoque) {
          // Quantidade atual em estoque (antes desta entrada)
          const quantidadeSaldoRow = await manager
            .createQueryBuilder(Estoque, 'e')
            .select(
              "COALESCE(SUM(CASE WHEN e.tipoMovimentacao = :entrada THEN e.quantidade ELSE 0 END), 0)",
            )
            .addSelect(
              "COALESCE(SUM(CASE WHEN e.tipoMovimentacao = :saida THEN e.quantidade ELSE 0 END), 0)",
            )
            .where('e.produtoId = :produtoId', { produtoId: itemData.produtoId })
            .setParameters({ entrada: TipoMovimentacao.ENTRADA, saida: TipoMovimentacao.SAIDA })
            .getRawOne<{ coalesce: number; coalesce_1: number }>();

          const entradas = Number(quantidadeSaldoRow?.coalesce || 0);
          const saídas = Number((quantidadeSaldoRow as any)?.coalesce_1 || 0);
          const quantidadeAtual = entradas - saídas;

          const precoMedioAtual = Number(produtoAtual.precoMedio || 0);

          const quantidadeNova = quantidadeAtual + itemData.quantidade;
          const precoMedioNovo = quantidadeNova > 0
            ? ((precoMedioAtual * quantidadeAtual) + (itemData.valorUnitario * itemData.quantidade)) / quantidadeNova
            : Number(itemData.valorUnitario);

          const precoAnterior = produtoAtual.precoMedio;
          produtoAtual.precoMedio = Number(precoMedioNovo.toFixed(2));
          await manager.save(Produto, produtoAtual);

          // Registrar no histórico do produto
          await this.produtoHistoricoService.registrarAlteracao(
            produtoAtual.id,
            compraData.usuarioId,
            TipoAlteracao.ATUALIZADO,
            { precoMedio: precoAnterior },
            { precoMedio: produtoAtual.precoMedio },
            `Atualização de preço médio via compra (${compraSalva.id})`,
          );
        }

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
          dataMovimentacao: dataCompraNormalizada,
          compraId: compraSalva.id,
          usuarioId: compraData.usuarioId,
          observacao: `Entrada via compra - Fornecedor: ${compraData.nomeFornecedor}`,
        });
        await manager.save(Estoque, estoque);

        // Observação: quando o produto não tem controle de estoque, não atualizamos preço médio
      }

      // Criar os pagamentos da compra e lançamentos financeiros
      const dataAtual = new Date();
      dataAtual.setHours(0, 0, 0, 0); // Zerar horas para comparação apenas de data

      // Função auxiliar para normalizar data (garantir que seja tratada como data local)
      const normalizeDate = (date: Date): Date => {
        const normalized = new Date(date);
        normalized.setHours(0, 0, 0, 0);
        return normalized;
      };

      for (const pagamentoData of compraData.pagamentos) {
        // Normalizar data de vencimento
        const dataVencimentoNormalizada = normalizeDate(pagamentoData.dataVencimento);
        
        // Verificar se a data de pagamento é futura
        let dataPagamentoEfetiva: Date | undefined = undefined;
        let status = StatusPagamento.PENDENTE;

        if (pagamentoData.dataPagamento) {
          const dataPagamento = normalizeDate(pagamentoData.dataPagamento);

          // Se a data de pagamento for hoje ou no passado, considerar como pago
          if (dataPagamento <= dataAtual) {
            dataPagamentoEfetiva = dataPagamento;
            status = StatusPagamento.PAGO;
          }
          // Se for futura, deixar como pendente (sem data de pagamento)
        }

        // Se for cartão de crédito com parcelas, criar um pagamento principal
        if (pagamentoData.formaPagamento === FormaPagamento.CARTAO_CREDITO && pagamentoData.quantidadeParcelas && pagamentoData.quantidadeParcelas > 1) {
          const valorParcela = pagamentoData.valor / pagamentoData.quantidadeParcelas;
          const datasParcelas = this.gerarDatasParcelas(dataVencimentoNormalizada, pagamentoData.quantidadeParcelas);
          
          // Criar pagamento principal (só para referência)
          const pagamento = manager.create(CompraPagamento, {
            compraId: compraSalva.id,
            formaPagamento: pagamentoData.formaPagamento,
            valor: pagamentoData.valor,
            dataVencimento: dataVencimentoNormalizada,
            dataPagamento: dataPagamentoEfetiva,
            status,
            observacao: `${pagamentoData.observacao || ''} - ${pagamentoData.quantidadeParcelas}x parcelas`.trim(),
          });
          await manager.save(CompraPagamento, pagamento);

          // Criar lançamentos financeiros para cada parcela
          for (let i = 0; i < pagamentoData.quantidadeParcelas; i++) {
            const dataVencimentoParcela = datasParcelas[i];
            
            // Para parcelas, apenas a primeira pode ter sido paga se a data for atual/passada
            let dataPagamentoParcela: Date | undefined = undefined;
            if (i === 0 && dataPagamentoEfetiva) {
              dataPagamentoParcela = dataPagamentoEfetiva;
            }
            
            const lancamento = manager.create(LancamentoFinanceiro, {
              tipoLancamento: TipoLancamento.DEBITO,
              valor: valorParcela,
              dataLancamento: dataCompraNormalizada,
              dataVencimento: dataVencimentoParcela,
              dataPagamento: dataPagamentoParcela,
              formaPagamento: pagamentoData.formaPagamento,
              compraId: compraSalva.id,
              usuarioId: compraData.usuarioId,
              observacao: `Compra - ${compraData.nomeFornecedor} - ${pagamentoData.formaPagamento} - Parcela ${i + 1}/${pagamentoData.quantidadeParcelas}`,
            });
            await manager.save(LancamentoFinanceiro, lancamento);
          }
        } else {
          // Pagamento único (à vista ou cartão sem parcelas)
          const pagamento = manager.create(CompraPagamento, {
            compraId: compraSalva.id,
            formaPagamento: pagamentoData.formaPagamento,
            valor: pagamentoData.valor,
            dataVencimento: dataVencimentoNormalizada,
            dataPagamento: dataPagamentoEfetiva,
            status,
            observacao: pagamentoData.observacao,
          });
          await manager.save(CompraPagamento, pagamento);

          // Criar lançamento financeiro para o pagamento
          // Se a data de pagamento for futura ou não informada, criar como pendente (sem dataPagamento)
          const lancamento = manager.create(LancamentoFinanceiro, {
            tipoLancamento: TipoLancamento.DEBITO,
            valor: pagamentoData.valor,
            dataLancamento: compraData.dataCompra,
            dataVencimento: dataVencimentoNormalizada,
            dataPagamento: dataPagamentoEfetiva,
            formaPagamento: pagamentoData.formaPagamento,
            compraId: compraSalva.id,
            usuarioId: compraData.usuarioId,
            observacao: `Compra - ${compraData.nomeFornecedor} - ${pagamentoData.formaPagamento}`,
          });
          await manager.save(LancamentoFinanceiro, lancamento);
        }
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

      // Deletar os lançamentos financeiros relacionados
      await manager.delete(LancamentoFinanceiro, { compraId: id });

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

  async getLancamentosFinanceiros(): Promise<LancamentoFinanceiro[]> {
    return this.lancamentoFinanceiroRepository.find({
      relations: ['compra', 'funcionario', 'usuario'],
      order: { dataLancamento: 'DESC' },
    });
  }

  async getLancamentosFinanceirosPorCompra(compraId: string): Promise<LancamentoFinanceiro[]> {
    return this.lancamentoFinanceiroRepository.find({
      where: { compraId },
      relations: ['compra', 'funcionario', 'usuario'],
      order: { dataLancamento: 'DESC' },
    });
  }

  async getLancamentosFinanceirosPorPeriodo(
    dataInicio: Date,
    dataFim: Date,
    tipoLancamento?: TipoLancamento
  ): Promise<LancamentoFinanceiro[]> {
    const query = this.lancamentoFinanceiroRepository
      .createQueryBuilder('lancamento')
      .leftJoinAndSelect('lancamento.compra', 'compra')
      .leftJoinAndSelect('lancamento.funcionario', 'funcionario')
      .leftJoinAndSelect('lancamento.usuario', 'usuario')
      .where('lancamento.dataLancamento BETWEEN :dataInicio AND :dataFim', {
        dataInicio,
        dataFim,
      });

    if (tipoLancamento) {
      query.andWhere('lancamento.tipoLancamento = :tipoLancamento', { tipoLancamento });
    }

    return query.orderBy('lancamento.dataLancamento', 'DESC').getMany();
  }
}

