import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, FindOptionsWhere } from 'typeorm';
import { LancamentoFinanceiro, TipoLancamento, FormaPagamento } from '../compra/lancamento-financeiro.entity';
import { CreateLancamentoFinanceiroDto } from './dto/create-lancamento-financeiro.dto';
import { UpdateLancamentoFinanceiroDto } from './dto/update-lancamento-financeiro.dto';
import { LancamentoFinanceiroFilterDto } from './dto/lancamento-financeiro-filter.dto';

@Injectable()
export class LancamentoFinanceiroService {
  constructor(
    @InjectRepository(LancamentoFinanceiro)
    private lancamentoFinanceiroRepository: Repository<LancamentoFinanceiro>,
  ) {}

  async create(createLancamentoFinanceiroDto: CreateLancamentoFinanceiroDto, usuarioId: string): Promise<LancamentoFinanceiro> {
    const lancamento = this.lancamentoFinanceiroRepository.create({
      ...createLancamentoFinanceiroDto,
      usuarioId,
    });

    return await this.lancamentoFinanceiroRepository.save(lancamento);
  }

  async findAll(filters: LancamentoFinanceiroFilterDto): Promise<{ data: LancamentoFinanceiro[]; total: number }> {
    const where: FindOptionsWhere<LancamentoFinanceiro> = {};

    if (filters.tipoLancamento) {
      where.tipoLancamento = filters.tipoLancamento;
    }

    if (filters.formaPagamento) {
      where.formaPagamento = filters.formaPagamento;
    }

    if (filters.dataInicio && filters.dataFim) {
      // Parse das datas garantindo que sejam interpretadas no timezone local
      // Formato esperado: "YYYY-MM-DD"
      const [anoInicio, mesInicio, diaInicio] = filters.dataInicio.split('-').map(Number);
      // Criar data no timezone local para início do dia
      const dataInicio = new Date(anoInicio, mesInicio - 1, diaInicio, 0, 0, 0, 0);
      
      const [anoFim, mesFim, diaFim] = filters.dataFim.split('-').map(Number);
      // Criar data no timezone local para fim do dia
      const dataFim = new Date(anoFim, mesFim - 1, diaFim, 23, 59, 59, 999);
      
      // Filtrar por dataVencimento ao invés de dataLancamento
      where.dataVencimento = Between(dataInicio, dataFim);
    }

    if (filters.funcionarioId) {
      where.funcionarioId = filters.funcionarioId;
    }

    if (filters.compraId) {
      where.compraId = filters.compraId;
    }

    const [data, total] = await this.lancamentoFinanceiroRepository.findAndCount({
      where,
      relations: ['usuario', 'funcionario', 'compra'],
      order: { dataLancamento: 'DESC' },
      skip: filters.skip || 0,
      take: filters.take || 50,
    });

    return { data, total };
  }

  async findOne(id: string): Promise<LancamentoFinanceiro> {
    const lancamento = await this.lancamentoFinanceiroRepository.findOne({
      where: { id },
      relations: ['usuario', 'funcionario', 'compra'],
    });

    if (!lancamento) {
      throw new NotFoundException('Lançamento financeiro não encontrado');
    }

    return lancamento;
  }

  async update(id: string, updateLancamentoFinanceiroDto: UpdateLancamentoFinanceiroDto): Promise<LancamentoFinanceiro> {
    const lancamento = await this.findOne(id);

    // Validações de negócio
    // Se informar data de pagamento mas não informar forma de pagamento, usar a forma existente
    if (updateLancamentoFinanceiroDto.dataPagamento && !updateLancamentoFinanceiroDto.formaPagamento) {
      // Se o lançamento já tem forma de pagamento, manter ela
      if (!lancamento.formaPagamento) {
        throw new BadRequestException('Forma de pagamento é obrigatória quando data de pagamento é informada e o lançamento não possui forma de pagamento');
      }
      // Manter a forma de pagamento existente
      updateLancamentoFinanceiroDto.formaPagamento = lancamento.formaPagamento;
    }

    Object.assign(lancamento, updateLancamentoFinanceiroDto);
    return await this.lancamentoFinanceiroRepository.save(lancamento);
  }

  async remove(id: string): Promise<void> {
    const lancamento = await this.findOne(id);
    await this.lancamentoFinanceiroRepository.remove(lancamento);
  }

  async getResumoFinanceiro(dataInicio?: Date, dataFim?: Date): Promise<{
    totalReceitas: number;
    totalDespesas: number;
    saldo: number;
    saldoDevedor: number;
    totalLancamentos: number;
    receitasRecebidas: number;
    receitasAReceber: number;
    despesasPagas: number;
    despesasAPagar: number;
  }> {
    const where: FindOptionsWhere<LancamentoFinanceiro> = {};

    if (dataInicio && dataFim) {
      // As datas já vêm ajustadas do controller (00:00:00 e 23:59:59)
      // Apenas garantir que são Date objects válidos
      const inicio = dataInicio instanceof Date ? dataInicio : new Date(dataInicio);
      const fim = dataFim instanceof Date ? dataFim : new Date(dataFim);
      
      // Filtrar por dataVencimento ao invés de dataLancamento
      where.dataVencimento = Between(inicio, fim);
    }

    const lancamentos = await this.lancamentoFinanceiroRepository.find({
      where,
    });

    const totalReceitas = lancamentos
      .filter(l => l.tipoLancamento === TipoLancamento.CREDITO)
      .reduce((sum, l) => sum + Number(l.valor), 0);

    const totalDespesas = lancamentos
      .filter(l => l.tipoLancamento === TipoLancamento.DEBITO)
      .reduce((sum, l) => sum + Number(l.valor), 0);

    // Saldo devedor: soma dos débitos não pagos (dataPagamento é null)
    const saldoDevedor = lancamentos
      .filter(l => l.tipoLancamento === TipoLancamento.DEBITO && !l.dataPagamento)
      .reduce((sum, l) => sum + Number(l.valor), 0);

    const receitasRecebidas = lancamentos
      .filter(l => l.tipoLancamento === TipoLancamento.CREDITO && !!l.dataPagamento)
      .reduce((sum, l) => sum + Number(l.valor), 0);

    const receitasAReceber = lancamentos
      .filter(l => l.tipoLancamento === TipoLancamento.CREDITO && !l.dataPagamento)
      .reduce((sum, l) => sum + Number(l.valor), 0);

    const despesasPagas = lancamentos
      .filter(l => l.tipoLancamento === TipoLancamento.DEBITO && !!l.dataPagamento)
      .reduce((sum, l) => sum + Number(l.valor), 0);

    const despesasAPagar = lancamentos
      .filter(l => l.tipoLancamento === TipoLancamento.DEBITO && !l.dataPagamento)
      .reduce((sum, l) => sum + Number(l.valor), 0);

    return {
      totalReceitas,
      totalDespesas,
      saldo: totalReceitas - totalDespesas,
      saldoDevedor,
      totalLancamentos: lancamentos.length,
      receitasRecebidas,
      receitasAReceber,
      despesasPagas,
      despesasAPagar,
    };
  }

  async getLancamentosPendentes(): Promise<LancamentoFinanceiro[]> {
    return await this.lancamentoFinanceiroRepository.find({
      where: {
        dataPagamento: null as any,
        dataVencimento: Between(new Date(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // próximos 30 dias
      },
      relations: ['usuario', 'funcionario', 'compra'],
      order: { dataVencimento: 'ASC' },
    });
  }
}
