import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository, Between, In } from 'typeorm';
import { Venda } from './venda.entity';
import { VendaItem } from './venda-item.entity';
import { VendaPagamento } from './venda-pagamento.entity';
import { Estoque, TipoMovimentacao } from '../compra/estoque.entity';
import { LancamentoFinanceiro, TipoLancamento, FormaPagamento } from '../compra/lancamento-financeiro.entity';
import { StatusPagamento } from '../compra/compra-pagamento.entity';
import { Produto } from '../produto/produto.entity';
import { User } from '../user/user.entity';
import { Funcionario } from '../funcionario/funcionario.entity';

interface VendaItemInput {
  produtoId: string;
  quantidade: number;
  valorUnitario: number;
}

interface VendaPagamentoInput {
  formaPagamento: FormaPagamento;
  valor: number;
  dataVencimento: Date;
  dataPagamento?: Date;
  quantidadeParcelas?: number;
  observacao?: string;
}

@Injectable()
export class VendaService {
  constructor(
    @InjectRepository(Venda) private vendaRepository: Repository<Venda>,
    @InjectRepository(VendaItem) private vendaItemRepository: Repository<VendaItem>,
    @InjectRepository(VendaPagamento) private vendaPagamentoRepository: Repository<VendaPagamento>,
    @InjectRepository(Estoque) private estoqueRepository: Repository<Estoque>,
    @InjectRepository(LancamentoFinanceiro) private lancamentoFinanceiroRepository: Repository<LancamentoFinanceiro>,
    @InjectRepository(Produto) private produtoRepository: Repository<Produto>,
    @InjectRepository(Funcionario) private funcionarioRepository: Repository<Funcionario>,
    private dataSource: DataSource,
  ) {}

  private gerarDatasParcelas(dataVencimento: Date, quantidadeParcelas: number): Date[] {
    const datas: Date[] = [];
    // Garantir que a data base está normalizada (00:00:00 no timezone local)
    const dataBase = new Date(dataVencimento);
    dataBase.setHours(0, 0, 0, 0);
    
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
      
      // Obter o último dia do mês
      const ultimoDiaDoMes = new Date(anoFinal, mesFinal + 1, 0).getDate();
      
      // Usar o dia original ou o último dia do mês, o que for menor
      const diaFinal = Math.min(diaOriginal, ultimoDiaDoMes);
      dataParcela.setDate(diaFinal);
      // Normalizar para 00:00:00 no timezone local
      dataParcela.setHours(0, 0, 0, 0);
      
      datas.push(dataParcela);
    }
    
    return datas;
  }

  async findAll(
    page = 1,
    pageSize = 20,
    filters?: {
      nomeCliente?: string;
      numeroVenda?: string;
      dataInicio?: string;
      dataFim?: string;
    }
  ): Promise<{ data: Venda[]; total: number; page: number; pageSize: number }> {
    const take = Math.max(1, Math.min(pageSize, 200));
    const skip = Math.max(0, (Math.max(1, page) - 1) * take);
    
    const queryBuilder = this.vendaRepository.createQueryBuilder('venda')
      .leftJoinAndSelect('venda.itens', 'itens')
      .leftJoinAndSelect('itens.produto', 'produto')
      .leftJoinAndSelect('venda.vendedor', 'vendedor')
      .leftJoinAndSelect('venda.usuario', 'usuario')
      .leftJoinAndSelect('venda.pagamentos', 'pagamentos');

    // Aplicar filtros
    if (filters?.nomeCliente) {
      queryBuilder.andWhere('venda.nomeCliente ILIKE :nomeCliente', {
        nomeCliente: `%${filters.nomeCliente}%`,
      });
    }

    if (filters?.numeroVenda) {
      queryBuilder.andWhere('venda.id::text ILIKE :numeroVenda', {
        numeroVenda: `%${filters.numeroVenda}%`,
      });
    }

    if (filters?.dataInicio) {
      const dataInicio = new Date(filters.dataInicio);
      dataInicio.setHours(0, 0, 0, 0);
      queryBuilder.andWhere('venda.dataVenda >= :dataInicio', {
        dataInicio: dataInicio.toISOString(),
      });
    }

    if (filters?.dataFim) {
      const dataFim = new Date(filters.dataFim);
      dataFim.setHours(23, 59, 59, 999);
      queryBuilder.andWhere('venda.dataVenda <= :dataFim', {
        dataFim: dataFim.toISOString(),
      });
    }

    queryBuilder.orderBy('venda.dataVenda', 'DESC');
    queryBuilder.skip(skip);
    queryBuilder.take(take);

    const [data, total] = await queryBuilder.getManyAndCount();
    return { data, total, page: Math.max(1, page), pageSize: take };
  }

  async findByFuncionarioAndPeriod(
    funcionarioId: string,
    dataInicio: string,
    dataFim: string,
  ): Promise<{ vendas: Venda[]; valorTotalComissao: number; salario: number; valorTotalPagamento: number }> {
    const dataInicioDate = new Date(dataInicio);
    dataInicioDate.setHours(0, 0, 0, 0);
    const dataFimDate = new Date(dataFim);
    dataFimDate.setHours(23, 59, 59, 999);

    const vendas = await this.vendaRepository.find({
      where: {
        vendedorId: funcionarioId,
        dataVenda: Between(dataInicioDate, dataFimDate),
      },
      relations: ['itens', 'itens.produto', 'vendedor'],
      order: { dataVenda: 'DESC' },
    });

    // Calcular comissão total
    let valorTotalComissao = 0;
    for (const venda of vendas) {
      for (const item of venda.itens) {
        if (item.produto && item.produto.percentualComissao) {
          const percentualComissao = Number(item.produto.percentualComissao) || 0;
          const valorItem = Number(item.valorTotal) || 0;
          const comissaoItem = (valorItem * percentualComissao) / 100;
          valorTotalComissao += comissaoItem;
        }
      }
    }

    // Buscar salário do funcionário
    const funcionario = await this.funcionarioRepository.findOne({
      where: { id: funcionarioId },
    });

    const salario = funcionario?.salario ? Number(funcionario.salario) : 0;
    const valorTotalPagamento = valorTotalComissao + salario;

    return {
      vendas,
      valorTotalComissao: Number(valorTotalComissao.toFixed(2)),
      salario: Number(salario.toFixed(2)),
      valorTotalPagamento: Number(valorTotalPagamento.toFixed(2)),
    };
  }

  async getDashboardStats(): Promise<{
    vendasDia: { quantidade: number; valor: number };
    vendasSemana: { quantidade: number; valor: number };
    vendasMes: { quantidade: number; valor: number };
    receitaMes: number;
    totalDespesasMes: number;
    saldoMes: number;
    produtosEstoqueBaixo: Array<{ id: string; nome: string; quantidadeEstoque: number; quantidadeMinimaEstoque: number }>;
    rankingVendedoresValor: Array<{ funcionarioId: string; funcionarioNome: string; valorTotal: number }>;
    rankingVendedoresQuantidade: Array<{ funcionarioId: string; funcionarioNome: string; quantidade: number }>;
    rankingProdutos: Array<{ produtoId: string; produtoNome: string; quantidade: number }>;
    valorEstoqueAtual: number;
    pagamentosDiaNaoRealizados: number;
    recebimentosDiaNaoRecebidos: number;
  }> {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const fimHoje = new Date(hoje);
    fimHoje.setHours(23, 59, 59, 999);

    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - hoje.getDay()); // Domingo da semana
    inicioSemana.setHours(0, 0, 0, 0);
    const fimSemana = new Date(fimHoje);

    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    inicioMes.setHours(0, 0, 0, 0);
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
    fimMes.setHours(23, 59, 59, 999);

    // Vendas do dia
    const vendasDia = await this.vendaRepository.find({
      where: {
        dataVenda: Between(hoje, fimHoje),
      },
    });
    const vendasDiaStats = {
      quantidade: vendasDia.length,
      valor: vendasDia.reduce((sum, v) => sum + Number(v.valorTotal), 0),
    };

    // Vendas da semana
    const vendasSemana = await this.vendaRepository.find({
      where: {
        dataVenda: Between(inicioSemana, fimSemana),
      },
    });
    const vendasSemanaStats = {
      quantidade: vendasSemana.length,
      valor: vendasSemana.reduce((sum, v) => sum + Number(v.valorTotal), 0),
    };

    // Vendas do mês
    const vendasMes = await this.vendaRepository.find({
      where: {
        dataVenda: Between(inicioMes, fimMes),
      },
      relations: ['vendedor', 'itens', 'itens.produto'],
    });
    const vendasMesStats = {
      quantidade: vendasMes.length,
      valor: vendasMes.reduce((sum, v) => sum + Number(v.valorTotal), 0),
    };

    // Receita do mês (lançamentos financeiros de crédito do mês)
    const lancamentosMes = await this.lancamentoFinanceiroRepository.find({
      where: {
        dataLancamento: Between(inicioMes, fimMes),
      },
    });
    const receitaMes = lancamentosMes
      .filter(l => l.tipoLancamento === TipoLancamento.CREDITO)
      .reduce((sum, l) => sum + Number(l.valor), 0);
    
    // Calcular saldo do mês (receitas - despesas)
    const totalDespesasMes = lancamentosMes
      .filter(l => l.tipoLancamento === TipoLancamento.DEBITO)
      .reduce((sum, l) => sum + Number(l.valor), 0);
    const saldoMes = receitaMes - totalDespesasMes;

    // Produtos com estoque baixo
    const produtosComEstoqueBaixo = await this.produtoRepository.find({
      where: { temEstoque: true },
    });
    const produtosEstoqueBaixo: Array<{ id: string; nome: string; quantidadeEstoque: number; quantidadeMinimaEstoque: number }> = [];
    for (const produto of produtosComEstoqueBaixo) {
      const estoque = await this.estoqueRepository
        .createQueryBuilder('estoque')
        .select('COALESCE(SUM(CASE WHEN estoque.tipoMovimentacao = :entrada THEN estoque.quantidade ELSE -estoque.quantidade END), 0)', 'total')
        .setParameter('entrada', TipoMovimentacao.ENTRADA)
        .where('estoque.produtoId = :produtoId', { produtoId: produto.id })
        .getRawOne();
      
      const quantidadeEstoque = Number(estoque?.total || 0);
      if (produto.quantidadeMinimaEstoque && quantidadeEstoque <= produto.quantidadeMinimaEstoque) {
        produtosEstoqueBaixo.push({
          id: produto.id,
          nome: produto.nome,
          quantidadeEstoque,
          quantidadeMinimaEstoque: produto.quantidadeMinimaEstoque,
        });
      }
    }

    // Ranking de vendedores por valor (mês)
    const rankingVendedoresValorMap = new Map<string, { funcionarioId: string; funcionarioNome: string; valorTotal: number }>();
    for (const venda of vendasMes) {
      if (venda.vendedor) {
        const existing = rankingVendedoresValorMap.get(venda.vendedorId);
        if (existing) {
          existing.valorTotal += Number(venda.valorTotal);
        } else {
          rankingVendedoresValorMap.set(venda.vendedorId, {
            funcionarioId: venda.vendedorId,
            funcionarioNome: venda.vendedor.nome,
            valorTotal: Number(venda.valorTotal),
          });
        }
      }
    }
    const rankingVendedoresValor = Array.from(rankingVendedoresValorMap.values())
      .sort((a, b) => b.valorTotal - a.valorTotal)
      .slice(0, 10);

    // Ranking de vendedores por quantidade (mês)
    const rankingVendedoresQuantidadeMap = new Map<string, { funcionarioId: string; funcionarioNome: string; quantidade: number }>();
    for (const venda of vendasMes) {
      if (venda.vendedor) {
        const existing = rankingVendedoresQuantidadeMap.get(venda.vendedorId);
        if (existing) {
          existing.quantidade += 1;
        } else {
          rankingVendedoresQuantidadeMap.set(venda.vendedorId, {
            funcionarioId: venda.vendedorId,
            funcionarioNome: venda.vendedor.nome,
            quantidade: 1,
          });
        }
      }
    }
    const rankingVendedoresQuantidade = Array.from(rankingVendedoresQuantidadeMap.values())
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 10);

    // Ranking de produtos mais vendidos
    const rankingProdutosMap = new Map<string, { produtoId: string; produtoNome: string; quantidade: number }>();
    for (const venda of vendasMes) {
      for (const item of venda.itens) {
        if (item.produto) {
          const existing = rankingProdutosMap.get(item.produtoId);
          if (existing) {
            existing.quantidade += item.quantidade;
          } else {
            rankingProdutosMap.set(item.produtoId, {
              produtoId: item.produtoId,
              produtoNome: item.produto.nome,
              quantidade: item.quantidade,
            });
          }
        }
      }
    }
    const rankingProdutos = Array.from(rankingProdutosMap.values())
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 10);

    // Calcular valor atual do estoque
    // Primeiro, buscar apenas produtos que têm controle de estoque
    const produtosComEstoque = await this.produtoRepository.find({
      where: { temEstoque: true },
      select: ['id', 'valor'],
    });
    const produtosComEstoqueIds = produtosComEstoque.map(p => p.id);
    
    let valorEstoqueAtual = 0;
    
    if (produtosComEstoqueIds.length > 0) {
      // Buscar estoques apenas dos produtos com controle de estoque
      const todosEstoques = await this.estoqueRepository.find({
        relations: ['produto'],
        where: {
          produtoId: In(produtosComEstoqueIds),
        },
      });
      
      // Criar mapa de produtos com valor
      const produtosMap = new Map<string, number>();
      for (const produto of produtosComEstoque) {
        produtosMap.set(produto.id, Number(produto.valor) || 0);
      }
      
      const saldoPorProduto = new Map<string, { quantidade: number }>();
      
      // Inicializar saldo apenas para produtos com controle de estoque
      for (const produtoId of produtosComEstoqueIds) {
        saldoPorProduto.set(produtoId, { quantidade: 0 });
      }
      
      for (const estoque of todosEstoques) {
        // Verificar se o produto tem controle de estoque
        if (!produtosComEstoqueIds.includes(estoque.produtoId)) {
          continue; // Pular produtos sem controle de estoque
        }
        
        if (!saldoPorProduto.has(estoque.produtoId)) {
          saldoPorProduto.set(estoque.produtoId, { quantidade: 0 });
        }
        const saldo = saldoPorProduto.get(estoque.produtoId);
        if (saldo) {
          if (estoque.tipoMovimentacao === TipoMovimentacao.ENTRADA) {
            saldo.quantidade += estoque.quantidade || 0;
          } else if (estoque.tipoMovimentacao === TipoMovimentacao.SAIDA) {
            saldo.quantidade -= estoque.quantidade || 0;
          }
        }
      }
      
      // Calcular valor considerando estoques positivos e negativos (apenas produtos com controle de estoque)
      for (const [produtoId, saldo] of saldoPorProduto.entries()) {
        // Considerar todos os estoques (positivos e negativos)
        const valorUnitario = produtosMap.get(produtoId) || 0;
        if (valorUnitario > 0) {
          valorEstoqueAtual += saldo.quantidade * valorUnitario;
        }
      }
    }

    // Pagamentos do dia que não foram realizados (débitos com dataVencimento = hoje e dataPagamento = null)
    const pagamentosDiaNaoRealizados = await this.lancamentoFinanceiroRepository.find({
      where: {
        tipoLancamento: TipoLancamento.DEBITO,
        dataVencimento: Between(hoje, fimHoje),
        dataPagamento: null as any,
      },
    });
    const valorPagamentosDiaNaoRealizados = pagamentosDiaNaoRealizados.reduce((sum, l) => sum + (Number(l.valor) || 0), 0);

    // Recebimentos previstos do dia que não foram recebidos (créditos com dataVencimento = hoje e dataPagamento = null)
    const recebimentosDiaNaoRecebidos = await this.lancamentoFinanceiroRepository.find({
      where: {
        tipoLancamento: TipoLancamento.CREDITO,
        dataVencimento: Between(hoje, fimHoje),
        dataPagamento: null as any,
      },
    });
    const valorRecebimentosDiaNaoRecebidos = recebimentosDiaNaoRecebidos.reduce((sum, l) => sum + (Number(l.valor) || 0), 0);

    return {
      vendasDia: {
        quantidade: vendasDiaStats.quantidade,
        valor: Number(vendasDiaStats.valor.toFixed(2)),
      },
      vendasSemana: {
        quantidade: vendasSemanaStats.quantidade,
        valor: Number(vendasSemanaStats.valor.toFixed(2)),
      },
      vendasMes: {
        quantidade: vendasMesStats.quantidade,
        valor: Number(vendasMesStats.valor.toFixed(2)),
      },
      receitaMes: Number(receitaMes.toFixed(2)),
      totalDespesasMes: Number(totalDespesasMes.toFixed(2)),
      saldoMes: Number(saldoMes.toFixed(2)),
      produtosEstoqueBaixo,
      rankingVendedoresValor,
      rankingVendedoresQuantidade,
      rankingProdutos,
      valorEstoqueAtual: Number(valorEstoqueAtual.toFixed(2)),
      pagamentosDiaNaoRealizados: Number(valorPagamentosDiaNaoRealizados.toFixed(2)),
      recebimentosDiaNaoRecebidos: Number(valorRecebimentosDiaNaoRecebidos.toFixed(2)),
    };
  }

  async findById(id: string): Promise<Venda | null> {
    const venda = await this.vendaRepository.findOne({ 
      where: { id }, 
      relations: ['itens', 'itens.produto', 'vendedor', 'usuario', 'pagamentos'] 
    });

    if (!venda) {
      return null;
    }

    // Buscar lançamentos financeiros da venda (igual ao compra.service.ts)
    const lancamentos = await this.lancamentoFinanceiroRepository.find({
      where: { vendaId: id },
      order: { dataLancamento: 'DESC' },
    });

    (venda as any).lancamentosFinanceiros = lancamentos;
    return venda;
  }

  async create(vendaData: {
    nomeCliente: string;
    rua?: string;
    bairro?: string;
    cidade?: string;
    numero?: string;
    observacao?: string;
    desconto?: number;
    dataVenda: Date;
    vendedorId: string;
    usuarioId: string;
    itens: VendaItemInput[];
    pagamentos: VendaPagamentoInput[];
  }): Promise<Venda> {
    
    return this.dataSource.transaction(async (manager) => {
      try {
        if (!vendaData.itens || vendaData.itens.length === 0) {
          throw new BadRequestException('Informe ao menos um item');
        }
        if (!vendaData.pagamentos || vendaData.pagamentos.length === 0) {
          throw new BadRequestException('Informe ao menos uma forma de pagamento');
        }

        let valorTotalItens = 0;
        const itensProcessados: Array<{ produtoId: string; quantidade: number; valorUnitario: number; valorTotal: number }> = [];
        for (const item of vendaData.itens) {
          const produto = await manager.findOne(Produto, { where: { id: item.produtoId } });
          if (!produto) throw new NotFoundException(`Produto ${item.produtoId} não encontrado`);
          
          // Garantir que quantidade e valorUnitario sejam números
          const quantidade = Number(item.quantidade);
          const valorUnitario = Number(item.valorUnitario);
          const valorTotalItem = quantidade * valorUnitario;
          
          valorTotalItens += valorTotalItem;
          
          // Garantir que valorTotalItem seja um número válido (parseFloat para garantir número, não string)
          const valorTotalFinal = parseFloat(valorTotalItem.toFixed(2));
          
          // Validar se o valor total é válido
          if (isNaN(valorTotalFinal) || valorTotalFinal <= 0) {
            throw new BadRequestException(`Valor total inválido para o item ${item.produtoId}: quantidade=${quantidade}, valorUnitario=${valorUnitario}, valorTotal=${valorTotalFinal}`);
          }
          
          itensProcessados.push({ 
            produtoId: item.produtoId, 
            quantidade: quantidade, 
            valorUnitario: valorUnitario, 
            valorTotal: valorTotalFinal 
          });
          
        }

        // Calcular desconto (default 0)
        const desconto = Number(vendaData.desconto || 0);
        
        // Calcular valor total após desconto
        const valorTotal = Math.max(0, valorTotalItens - desconto);

        // Validar se o valor dos pagamentos é igual ao valor total (após desconto)
        const valorTotalPagamentos = vendaData.pagamentos.reduce((total, pag) => total + Number(pag.valor), 0);
        if (Math.abs(valorTotalPagamentos - valorTotal) > 0.01) {
          throw new BadRequestException(
            `O valor total dos pagamentos (R$ ${valorTotalPagamentos.toFixed(2)}) deve ser igual ao valor total da venda (R$ ${valorTotal.toFixed(2)})`
          );
        }

        // Validar se usuário existe (usuarioId é obrigatório - quem opera o sistema)
        const usuario = await manager.findOne(User, { where: { id: vendaData.usuarioId } });
        if (!usuario) {
          throw new NotFoundException(`Usuário com ID ${vendaData.usuarioId} não encontrado`);
        }

        // Validar se vendedor (Funcionario) existe (vendedorId é obrigatório - quem vende)
        const vendedor = await manager.findOne(Funcionario, { where: { id: vendaData.vendedorId } });
        if (!vendedor) {
          throw new NotFoundException(`Funcionário vendedor com ID ${vendaData.vendedorId} não encontrado`);
        }
        
        // Normalizar dataVenda para 00:00:00 no timezone local
        const dataVendaNormalizada = new Date(vendaData.dataVenda);
        dataVendaNormalizada.setHours(0, 0, 0, 0);

        // Criar venda sem itens (para evitar cascade tentando salvar itens sem valorTotal)
        const venda = manager.create(Venda, { 
          nomeCliente: vendaData.nomeCliente,
          rua: vendaData.rua,
          bairro: vendaData.bairro,
          cidade: vendaData.cidade,
          numero: vendaData.numero,
          observacao: vendaData.observacao,
          dataVenda: dataVendaNormalizada,
          valorTotal: valorTotal,
          desconto: desconto,
          vendedorId: vendaData.vendedorId,
          usuarioId: vendaData.usuarioId,
        });
        const vendaSalva = await manager.save(Venda, venda);

        // Usar exatamente a mesma abordagem do compra.service.ts
        for (const itemData of itensProcessados) {
          
          // Validar se valorTotal é válido
          if (!itemData.valorTotal || isNaN(itemData.valorTotal) || itemData.valorTotal <= 0) {
            throw new BadRequestException(`Valor total inválido para o item ${itemData.produtoId}: ${itemData.valorTotal}`);
          }
          
          // Garantir que todos os valores sejam números válidos antes de criar
          const quantidadeFinal = Number(itemData.quantidade);
          const valorUnitarioFinal = Number(itemData.valorUnitario);
          const valorTotalFinal = Number(itemData.valorTotal);
          
          // Validar todos os valores
          if (isNaN(quantidadeFinal) || quantidadeFinal <= 0) {
            throw new BadRequestException(`Quantidade inválida: ${quantidadeFinal}`);
          }
          if (isNaN(valorUnitarioFinal) || valorUnitarioFinal <= 0) {
            throw new BadRequestException(`Valor unitário inválido: ${valorUnitarioFinal}`);
          }
          if (isNaN(valorTotalFinal) || valorTotalFinal <= 0) {
            throw new BadRequestException(`Valor total inválido: ${valorTotalFinal}`);
          }
          
          // Criar objeto explicitamente com todos os campos como números
          const vendaItemData = {
            vendaId: vendaSalva.id,
            produtoId: itemData.produtoId,
            quantidade: quantidadeFinal,
            valorUnitario: valorUnitarioFinal,
            valorTotal: valorTotalFinal,
          };
          
          // Tentar usar insert diretamente para garantir que o valor seja passado corretamente
          // Isso evita problemas com o TypeORM não reconhecendo valores DECIMAL
          await manager
            .createQueryBuilder()
            .insert()
            .into(VendaItem)
            .values({
              vendaId: vendaSalva.id,
              produtoId: vendaItemData.produtoId,
              quantidade: vendaItemData.quantidade,
              valorUnitario: vendaItemData.valorUnitario,
              valorTotal: vendaItemData.valorTotal,
            })
            .execute();
          
          // baixa de estoque (SAIDA)
          const estoque = manager.create(Estoque, {
            produtoId: itemData.produtoId,
            quantidade: itemData.quantidade,
            tipoMovimentacao: TipoMovimentacao.SAIDA,
            valorUnitario: itemData.valorUnitario,
            dataMovimentacao: dataVendaNormalizada,
            usuarioId: vendaData.usuarioId,
            observacao: `Saída via venda` ,
          });
          await manager.save(Estoque, estoque);
        }

        // pagamentos e lançamentos (crédito)
        const dataAtual = new Date();
        dataAtual.setHours(0, 0, 0, 0);

        for (const pag of vendaData.pagamentos) {
          
          // Garantir que dataVencimento seja um Date
          let dataVencimento: Date;
          if (pag.dataVencimento instanceof Date) {
            dataVencimento = new Date(pag.dataVencimento);
          } else if (typeof pag.dataVencimento === 'string') {
            dataVencimento = new Date(pag.dataVencimento);
          } else {
            dataVencimento = new Date(pag.dataVencimento);
          }
          dataVencimento.setHours(0, 0, 0, 0);
          
          let dataPagamentoEfetiva: Date | undefined = undefined;
          let status: StatusPagamento = StatusPagamento.PENDENTE;

          if (pag.dataPagamento) {
            const dataPagamento = new Date(pag.dataPagamento);
            dataPagamento.setHours(0, 0, 0, 0);
            if (dataPagamento <= dataAtual) {
              dataPagamentoEfetiva = dataPagamento;
              status = StatusPagamento.PAGO;
            }
          }

          // Se tiver mais de 1 parcela, criar lançamentos por parcela (independente da forma de pagamento)
          if (pag.quantidadeParcelas && pag.quantidadeParcelas > 1) {
            const valorParcela = pag.valor / pag.quantidadeParcelas;
            const datasParcelas = this.gerarDatasParcelas(dataVencimento, pag.quantidadeParcelas);
            
            
            // Criar pagamento principal (só para referência)
            const observacaoParcela = `${pag.observacao || ''} - ${pag.quantidadeParcelas}x parcelas`.trim();
            
            const pagamentoData: any = {
              vendaId: vendaSalva.id,
              formaPagamento: pag.formaPagamento,
              valor: pag.valor,
              dataVencimento: dataVencimento,
              dataPagamento: dataPagamentoEfetiva,
              status,
            };
            
            if (observacaoParcela) {
              pagamentoData.observacao = observacaoParcela;
            }
            
            const pagamento = manager.create(VendaPagamento, pagamentoData);
            await manager.save(VendaPagamento, pagamento);

            // Criar lançamentos financeiros para cada parcela
            for (let i = 0; i < pag.quantidadeParcelas; i++) {
              const dataVencimentoParcela = datasParcelas[i];
              let dataPagamentoParcela: Date | undefined = undefined;
              if (i === 0 && dataPagamentoEfetiva) {
                dataPagamentoParcela = dataPagamentoEfetiva;
              }
              
              const lanc = manager.create(LancamentoFinanceiro, {
                tipoLancamento: TipoLancamento.CREDITO,
                valor: valorParcela,
                dataLancamento: dataVendaNormalizada,
                dataVencimento: dataVencimentoParcela,
                dataPagamento: dataPagamentoParcela,
                formaPagamento: pag.formaPagamento,
                vendaId: vendaSalva.id,
                usuarioId: vendaData.usuarioId,
                observacao: `Venda - ${vendaData.nomeCliente} - ${pag.formaPagamento} - Parcela ${i + 1}/${pag.quantidadeParcelas}`,
              });
              await manager.save(LancamentoFinanceiro, lanc);
            }
          } else {
            // Pagamento único (à vista ou cartão sem parcelas)
            try {
              const pagamentoData: any = {
                vendaId: vendaSalva.id,
                formaPagamento: pag.formaPagamento,
                valor: pag.valor,
                dataVencimento: pag.dataVencimento,
                dataPagamento: dataPagamentoEfetiva,
                status,
              };
              
              if (pag.observacao) {
                pagamentoData.observacao = pag.observacao;
              }
              
              const pagamento = manager.create(VendaPagamento, pagamentoData);
              await manager.save(VendaPagamento, pagamento);
            } catch (pagError) {
              console.error('========== ERRO AO SALVAR PAGAMENTO ==========');
              console.error('Erro:', pagError);
              console.error('Mensagem:', pagError?.message);
              console.error('Stack:', pagError?.stack);
              console.error('Código:', pagError?.code);
              console.error('==============================================');
              throw pagError;
            }

            // Criar lançamento financeiro único
            try {
              // Garantir que dataVencimento seja um Date
              let dataVencimentoUnico: Date;
              if (pag.dataVencimento instanceof Date) {
                dataVencimentoUnico = new Date(pag.dataVencimento);
              } else if (typeof pag.dataVencimento === 'string') {
                dataVencimentoUnico = new Date(pag.dataVencimento);
              } else {
                dataVencimentoUnico = new Date(pag.dataVencimento);
              }
              dataVencimentoUnico.setHours(0, 0, 0, 0);
              
              const lanc = manager.create(LancamentoFinanceiro, {
                tipoLancamento: TipoLancamento.CREDITO,
                valor: pag.valor,
                dataLancamento: dataVendaNormalizada,
                dataVencimento: dataVencimentoUnico,
                dataPagamento: dataPagamentoEfetiva,
                formaPagamento: pag.formaPagamento,
                vendaId: vendaSalva.id,
                usuarioId: vendaData.usuarioId,
                observacao: `Venda - ${vendaData.nomeCliente} - ${pag.formaPagamento}`,
              });
              await manager.save(LancamentoFinanceiro, lanc);
            } catch (lancError) {
              console.error('========== ERRO AO SALVAR LANÇAMENTO FINANCEIRO ==========');
              console.error('Erro:', lancError);
              console.error('Mensagem:', lancError?.message);
              console.error('Stack:', lancError?.stack);
              console.error('Código:', lancError?.code);
              console.error('===========================================================');
              throw lancError;
            }
          }
        }

        const vendaCompleta = await manager.findOne(Venda, { where: { id: vendaSalva.id }, relations: ['itens', 'itens.produto', 'vendedor', 'usuario', 'pagamentos'] });
        if (!vendaCompleta) {
          throw new Error('Erro ao buscar venda criada');
        }
        return vendaCompleta;
      } catch (error) {
        console.error('========== ERRO AO CRIAR VENDA ==========');
        console.error('Erro:', error);
        console.error('Mensagem:', error?.message);
        console.error('Stack:', error?.stack);
        console.error('Código:', error?.code);
        console.error('==========================================');
        throw error;
      }
    });
  }

  async update(id: string, vendaData: {
    nomeCliente: string;
    rua?: string;
    bairro?: string;
    cidade?: string;
    numero?: string;
    observacao?: string;
    desconto?: number;
    dataVenda: Date;
    vendedorId: string;
    usuarioId: string;
    itens: VendaItemInput[];
    pagamentos: VendaPagamentoInput[];
  }): Promise<Venda> {
    return this.dataSource.transaction(async (manager) => {
      try {
        // Buscar venda existente
        const vendaExistente = await manager.findOne(Venda, { 
          where: { id },
          relations: ['itens', 'pagamentos']
        });
        
        if (!vendaExistente) {
          throw new NotFoundException(`Venda com ID ${id} não encontrada`);
        }

        if (!vendaData.itens || vendaData.itens.length === 0) {
          throw new BadRequestException('Informe ao menos um item');
        }
        if (!vendaData.pagamentos || vendaData.pagamentos.length === 0) {
          throw new BadRequestException('Informe ao menos uma forma de pagamento');
        }

        // Calcular valor total dos itens
        let valorTotalItens = 0;
        const itensProcessados: Array<{ produtoId: string; quantidade: number; valorUnitario: number; valorTotal: number }> = [];
        for (const item of vendaData.itens) {
          const produto = await manager.findOne(Produto, { where: { id: item.produtoId } });
          if (!produto) throw new NotFoundException(`Produto ${item.produtoId} não encontrado`);
          
          const quantidade = Number(item.quantidade);
          const valorUnitario = Number(item.valorUnitario);
          const valorTotalItem = quantidade * valorUnitario;
          
          valorTotalItens += valorTotalItem;
          const valorTotalFinal = parseFloat(valorTotalItem.toFixed(2));
          
          if (isNaN(valorTotalFinal) || valorTotalFinal <= 0) {
            throw new BadRequestException(`Valor total inválido para o item ${item.produtoId}`);
          }
          
          itensProcessados.push({ 
            produtoId: item.produtoId, 
            quantidade: quantidade, 
            valorUnitario: valorUnitario, 
            valorTotal: valorTotalFinal 
          });
        }

        const desconto = Number(vendaData.desconto || 0);
        const valorTotal = Math.max(0, valorTotalItens - desconto);

        // Validar valor dos pagamentos
        const valorTotalPagamentos = vendaData.pagamentos.reduce((total, pag) => total + Number(pag.valor), 0);
        if (Math.abs(valorTotalPagamentos - valorTotal) > 0.01) {
          throw new BadRequestException(
            `O valor total dos pagamentos (R$ ${valorTotalPagamentos.toFixed(2)}) deve ser igual ao valor total da venda (R$ ${valorTotal.toFixed(2)})`
          );
        }

        // Validar usuário e vendedor
        const usuario = await manager.findOne(User, { where: { id: vendaData.usuarioId } });
        if (!usuario) {
          throw new NotFoundException(`Usuário com ID ${vendaData.usuarioId} não encontrado`);
        }

        const vendedor = await manager.findOne(Funcionario, { where: { id: vendaData.vendedorId } });
        if (!vendedor) {
          throw new NotFoundException(`Funcionário vendedor com ID ${vendaData.vendedorId} não encontrado`);
        }
        
        const dataVendaNormalizada = new Date(vendaData.dataVenda);
        dataVendaNormalizada.setHours(0, 0, 0, 0);

        // Atualizar dados da venda
        vendaExistente.nomeCliente = vendaData.nomeCliente;
        vendaExistente.rua = vendaData.rua;
        vendaExistente.bairro = vendaData.bairro;
        vendaExistente.cidade = vendaData.cidade;
        vendaExistente.numero = vendaData.numero;
        vendaExistente.observacao = vendaData.observacao;
        vendaExistente.dataVenda = dataVendaNormalizada;
        vendaExistente.valorTotal = valorTotal;
        vendaExistente.desconto = desconto;
        vendaExistente.vendedorId = vendaData.vendedorId;
        vendaExistente.usuarioId = vendaData.usuarioId;
        
        await manager.save(Venda, vendaExistente);

        // Remover itens antigos e criar novos
        await manager.delete(VendaItem, { vendaId: id });
        
        // Reverter estoque dos itens antigos
        for (const itemAntigo of vendaExistente.itens) {
          const estoqueReversao = manager.create(Estoque, {
            produtoId: itemAntigo.produtoId,
            quantidade: itemAntigo.quantidade,
            tipoMovimentacao: TipoMovimentacao.ENTRADA,
            valorUnitario: itemAntigo.valorUnitario,
            dataMovimentacao: dataVendaNormalizada,
            usuarioId: vendaData.usuarioId,
            observacao: `Reversão de estoque - Edição de venda`,
          });
          await manager.save(Estoque, estoqueReversao);
        }

        // Criar novos itens e baixar estoque
        for (const itemData of itensProcessados) {
          await manager
            .createQueryBuilder()
            .insert()
            .into(VendaItem)
            .values({
              vendaId: id,
              produtoId: itemData.produtoId,
              quantidade: itemData.quantidade,
              valorUnitario: itemData.valorUnitario,
              valorTotal: itemData.valorTotal,
            })
            .execute();
          
          // Baixa de estoque (SAIDA)
          const estoque = manager.create(Estoque, {
            produtoId: itemData.produtoId,
            quantidade: itemData.quantidade,
            tipoMovimentacao: TipoMovimentacao.SAIDA,
            valorUnitario: itemData.valorUnitario,
            dataMovimentacao: dataVendaNormalizada,
            usuarioId: vendaData.usuarioId,
            observacao: `Saída via venda (editada)`,
          });
          await manager.save(Estoque, estoque);
        }

        // Remover pagamentos e lançamentos financeiros antigos
        await manager.delete(VendaPagamento, { vendaId: id });
        await manager.delete(LancamentoFinanceiro, { vendaId: id });

        // Criar novos pagamentos e lançamentos
        const dataAtual = new Date();
        dataAtual.setHours(0, 0, 0, 0);

        for (const pag of vendaData.pagamentos) {
          let dataVencimento: Date;
          if (pag.dataVencimento instanceof Date) {
            dataVencimento = new Date(pag.dataVencimento);
          } else {
            dataVencimento = new Date(pag.dataVencimento);
          }
          dataVencimento.setHours(0, 0, 0, 0);
          
          let dataPagamentoEfetiva: Date | undefined = undefined;
          let status: StatusPagamento = StatusPagamento.PENDENTE;

          if (pag.dataPagamento) {
            const dataPagamento = new Date(pag.dataPagamento);
            dataPagamento.setHours(0, 0, 0, 0);
            if (dataPagamento <= dataAtual) {
              dataPagamentoEfetiva = dataPagamento;
              status = StatusPagamento.PAGO;
            }
          }

          if (pag.quantidadeParcelas && pag.quantidadeParcelas > 1) {
            const valorParcela = pag.valor / pag.quantidadeParcelas;
            const datasParcelas = this.gerarDatasParcelas(dataVencimento, pag.quantidadeParcelas);
            
            const observacaoParcela = `${pag.observacao || ''} - ${pag.quantidadeParcelas}x parcelas`.trim();
            
            const pagamentoData: any = {
              vendaId: id,
              formaPagamento: pag.formaPagamento,
              valor: pag.valor,
              dataVencimento: dataVencimento,
              dataPagamento: dataPagamentoEfetiva,
              status,
            };
            
            if (observacaoParcela) {
              pagamentoData.observacao = observacaoParcela;
            }
            
            const pagamento = manager.create(VendaPagamento, pagamentoData);
            await manager.save(VendaPagamento, pagamento);

            for (let i = 0; i < pag.quantidadeParcelas; i++) {
              const dataVencimentoParcela = datasParcelas[i];
              let dataPagamentoParcela: Date | undefined = undefined;
              if (i === 0 && dataPagamentoEfetiva) {
                dataPagamentoParcela = dataPagamentoEfetiva;
              }
              
              const lanc = manager.create(LancamentoFinanceiro, {
                tipoLancamento: TipoLancamento.CREDITO,
                valor: valorParcela,
                dataLancamento: dataVendaNormalizada,
                dataVencimento: dataVencimentoParcela,
                dataPagamento: dataPagamentoParcela,
                formaPagamento: pag.formaPagamento,
                vendaId: id,
                usuarioId: vendaData.usuarioId,
                observacao: `Venda - ${vendaData.nomeCliente} - ${pag.formaPagamento} - Parcela ${i + 1}/${pag.quantidadeParcelas}`,
              });
              await manager.save(LancamentoFinanceiro, lanc);
            }
          } else {
            const pagamentoData: any = {
              vendaId: id,
              formaPagamento: pag.formaPagamento,
              valor: pag.valor,
              dataVencimento: pag.dataVencimento,
              dataPagamento: dataPagamentoEfetiva,
              status,
            };
            
            if (pag.observacao) {
              pagamentoData.observacao = pag.observacao;
            }
            
            const pagamento = manager.create(VendaPagamento, pagamentoData);
            await manager.save(VendaPagamento, pagamento);

            let dataVencimentoUnico: Date;
            if (pag.dataVencimento instanceof Date) {
              dataVencimentoUnico = new Date(pag.dataVencimento);
            } else {
              dataVencimentoUnico = new Date(pag.dataVencimento);
            }
            dataVencimentoUnico.setHours(0, 0, 0, 0);
            
            const lanc = manager.create(LancamentoFinanceiro, {
              tipoLancamento: TipoLancamento.CREDITO,
              valor: pag.valor,
              dataLancamento: dataVendaNormalizada,
              dataVencimento: dataVencimentoUnico,
              dataPagamento: dataPagamentoEfetiva,
              formaPagamento: pag.formaPagamento,
              vendaId: id,
              usuarioId: vendaData.usuarioId,
              observacao: `Venda - ${vendaData.nomeCliente} - ${pag.formaPagamento}`,
            });
            await manager.save(LancamentoFinanceiro, lanc);
          }
        }

        const vendaAtualizada = await manager.findOne(Venda, { 
          where: { id }, 
          relations: ['itens', 'itens.produto', 'vendedor', 'usuario', 'pagamentos'] 
        });
        
        if (!vendaAtualizada) {
          throw new Error('Erro ao buscar venda atualizada');
        }
        
        return vendaAtualizada;
      } catch (error) {
        console.error('========== ERRO AO ATUALIZAR VENDA ==========');
        console.error('Erro:', error);
        console.error('Mensagem:', error?.message);
        console.error('Stack:', error?.stack);
        console.error('=============================================');
        throw error;
      }
    });
  }
}


