import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { LancamentoFinanceiroService } from './lancamento-financeiro.service';
import { CreateLancamentoFinanceiroDto } from './dto/create-lancamento-financeiro.dto';
import { UpdateLancamentoFinanceiroDto } from './dto/update-lancamento-financeiro.dto';
import { LancamentoFinanceiroFilterDto } from './dto/lancamento-financeiro-filter.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('lancamentos-financeiros')
@UseGuards(JwtAuthGuard)
export class LancamentoFinanceiroController {
  constructor(private readonly lancamentoFinanceiroService: LancamentoFinanceiroService) {}

  @Post()
  create(@Body() createLancamentoFinanceiroDto: CreateLancamentoFinanceiroDto, @Request() req) {
    return this.lancamentoFinanceiroService.create(createLancamentoFinanceiroDto, req.user.id);
  }

  @Post('pagamento-funcionario')
  async createPagamentoFuncionario(
    @Body() body: {
      funcionarioId: string;
      dataLancamento: string;
      dataPagamento?: string;
      formaPagamento: string;
      valor: number;
      desconto?: number;
      observacao?: string;
    },
    @Request() req,
  ) {
    // Criar lançamento financeiro de débito para pagamento de funcionário
    const dataLancamento = new Date(body.dataLancamento);
    dataLancamento.setHours(0, 0, 0, 0);
    const dataPagamento = body.dataPagamento ? new Date(body.dataPagamento) : undefined;
    if (dataPagamento) {
      dataPagamento.setHours(0, 0, 0, 0);
    }
    
    // Aplicar desconto se existir
    const descontoValue = body.desconto ? Number(body.desconto) : 0;
    const valorFinal = Math.max(0, body.valor - descontoValue);
    
    const observacaoFinal = body.observacao || 
      `Pagamento de funcionário${descontoValue > 0 ? ` (Desconto: R$ ${descontoValue.toFixed(2)})` : ''}`;
    
    return this.lancamentoFinanceiroService.create(
      {
        tipoLancamento: 'DEBITO' as any,
        valor: valorFinal,
        dataLancamento: dataLancamento.toISOString(),
        dataPagamento: dataPagamento?.toISOString(),
        formaPagamento: body.formaPagamento as any,
        funcionarioId: body.funcionarioId,
        observacao: observacaoFinal,
      },
      req.user.id,
    );
  }

  @Get()
  findAll(@Query() filters: LancamentoFinanceiroFilterDto) {
    return this.lancamentoFinanceiroService.findAll(filters);
  }

  @Get('resumo')
  getResumoFinanceiro(
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
  ) {
    // Converter strings de data para Date objects no timezone local
    let dataInicioDate: Date | undefined;
    let dataFimDate: Date | undefined;
    
    if (dataInicio) {
      const [ano, mes, dia] = dataInicio.split('-').map(Number);
      dataInicioDate = new Date(ano, mes - 1, dia, 0, 0, 0, 0);
    }
    
    if (dataFim) {
      const [ano, mes, dia] = dataFim.split('-').map(Number);
      dataFimDate = new Date(ano, mes - 1, dia, 23, 59, 59, 999);
    }
    
    return this.lancamentoFinanceiroService.getResumoFinanceiro(
      dataInicioDate,
      dataFimDate,
    );
  }

  @Get('pendentes')
  getLancamentosPendentes() {
    return this.lancamentoFinanceiroService.getLancamentosPendentes();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.lancamentoFinanceiroService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateLancamentoFinanceiroDto: UpdateLancamentoFinanceiroDto,
  ) {
    return this.lancamentoFinanceiroService.update(id, updateLancamentoFinanceiroDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.lancamentoFinanceiroService.remove(id);
  }
}
