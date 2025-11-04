import { Controller, Get, Post, Body, Query, Param, ParseUUIDPipe, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
import { VendaService } from './venda.service';
import { FormaPagamento } from '../compra/compra-pagamento.entity';

@Controller('venda')
export class VendaController {
  constructor(private vendaService: VendaService) {}

  @Get()
  async findAll(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('nomeCliente') nomeCliente?: string,
    @Query('vendedorId') vendedorId?: string,
    @Query('dataInicio') dataInicio?: string,
    @Query('dataFim') dataFim?: string,
  ) {
    return this.vendaService.findAll(
      Number(page) || 1,
      Number(pageSize) || 20,
      {
        nomeCliente: nomeCliente || undefined,
        vendedorId: vendedorId || undefined,
        dataInicio: dataInicio || undefined,
        dataFim: dataFim || undefined,
      }
    );
  }

  @Get('dashboard/stats')
  async getDashboardStats() {
    return this.vendaService.getDashboardStats();
  }

  @Get('funcionario/:funcionarioId')
  async findByFuncionarioAndPeriod(
    @Param('funcionarioId', ParseUUIDPipe) funcionarioId: string,
    @Query('dataInicio') dataInicio: string,
    @Query('dataFim') dataFim: string,
  ) {
    if (!dataInicio || !dataFim) {
      throw new BadRequestException('Data início e data fim são obrigatórias');
    }
    return this.vendaService.findByFuncionarioAndPeriod(funcionarioId, dataInicio, dataFim);
  }

  @Get(':id')
  async findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.vendaService.findById(id);
  }

  @Post()
  async create(@Body() body: {
    nomeCliente: string;
    rua?: string;
    bairro?: string;
    cidade?: string;
    numero?: string;
    observacao?: string;
    desconto?: number;
    dataVenda: string;
    vendedorId: string;
    usuarioId: string;
    itens: Array<{ produtoId: string; quantidade: number; valorUnitario: number }>;
    pagamentos: Array<{ formaPagamento: FormaPagamento; valor: number; dataVencimento: string; dataPagamento?: string; quantidadeParcelas?: number; observacao?: string }>;
  }) {
    try {
      // Validar campos obrigatórios
      if (!body.nomeCliente) {
        throw new BadRequestException('Nome do cliente é obrigatório');
      }
      if (!body.vendedorId) {
        throw new BadRequestException('Vendedor é obrigatório');
      }
      if (!body.usuarioId) {
        throw new BadRequestException('Usuário é obrigatório');
      }
      if (!body.dataVenda) {
        throw new BadRequestException('Data da venda é obrigatória');
      }
      if (!body.itens || body.itens.length === 0) {
        throw new BadRequestException('Informe ao menos um item');
      }
      if (!body.pagamentos || body.pagamentos.length === 0) {
        throw new BadRequestException('Informe ao menos uma forma de pagamento');
      }

      // Converter datas
      const dataVenda = new Date(body.dataVenda);
      if (isNaN(dataVenda.getTime())) {
        throw new BadRequestException('Data da venda inválida');
      }

      const pagamentosProcessados = body.pagamentos.map(p => {
        const dataVencimento = new Date(p.dataVencimento);
        if (isNaN(dataVencimento.getTime())) {
          throw new BadRequestException(`Data de vencimento inválida: ${p.dataVencimento}`);
        }
        return {
          ...p,
          dataVencimento,
          dataPagamento: p.dataPagamento ? new Date(p.dataPagamento) : undefined
        };
      });

      return await this.vendaService.create({
        ...body,
        desconto: body.desconto || 0,
        dataVenda,
        itens: body.itens,
        pagamentos: pagamentosProcessados,
      });
    } catch (error) {
      // Se já é uma HttpException, apenas relança
      if (error instanceof HttpException) {
        throw error;
      }
      
      // Se não for, converte para HttpException com mensagem detalhada
      const errorMessage = error?.message || 'Erro interno ao processar venda';
      const statusCode = error?.status || HttpStatus.INTERNAL_SERVER_ERROR;
      
      throw new HttpException(
        {
          statusCode,
          message: errorMessage,
          error: error?.name || 'Internal Server Error',
          details: process.env.NODE_ENV === 'development' ? error?.stack : undefined,
        },
        statusCode,
      );
    }
  }
}


