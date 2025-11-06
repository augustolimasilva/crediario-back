import { Controller, Get, Post, Delete, Body, Param, ParseUUIDPipe, Query, HttpException, HttpStatus, Logger, BadRequestException } from '@nestjs/common';
import { CompraService } from './compra.service';
import { FormaPagamento } from './compra-pagamento.entity';
import { TipoLancamento } from './lancamento-financeiro.entity';

@Controller('compra')
export class CompraController {
  private readonly logger = new Logger(CompraController.name);
  
  constructor(private compraService: CompraService) {}

  @Get('estoque/todos')
  async getEstoque() {
    return this.compraService.getEstoque();
  }

  @Get('estoque/produto/:produtoId')
  async getEstoquePorProduto(@Param('produtoId', ParseUUIDPipe) produtoId: string) {
    return this.compraService.getEstoquePorProduto(produtoId);
  }

  @Get()
  async getAllCompras(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.compraService.findAll(Number(page) || 1, Number(pageSize) || 20);
  }

  @Get(':id')
  async getCompraById(@Param('id', ParseUUIDPipe) id: string) {
    return this.compraService.findById(id);
  }

  @Post()
  async createCompra(
    @Body() compraData: {
      nomeFornecedor: string;
      dataCompra: string;
      usuarioId: string;
      observacao?: string;
      desconto?: number;
      itens: Array<{
        produtoId: string;
        quantidade: number;
        valorUnitario: number;
      }>;
      pagamentos: Array<{
        formaPagamento: FormaPagamento;
        valor: number;
        dataVencimento: string;
        dataPagamento?: string;
        observacao?: string;
        quantidadeParcelas?: number;
      }>;
    },
  ) {
    try {
      // Função auxiliar para criar data a partir de string YYYY-MM-DD sem problemas de timezone
      // Cria a data diretamente a partir dos componentes para evitar interpretação como UTC
      const parseDate = (dateString: string): Date => {
        if (!dateString || !dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
          throw new BadRequestException(`Data inválida: ${dateString}`);
        }
        const [year, month, day] = dateString.split('-').map(Number);
        // Criar data no timezone local (não UTC)
        const date = new Date(year, month - 1, day);
        date.setHours(0, 0, 0, 0);
        return date;
      };

      // Normalizar dataCompra
      const dataCompra = parseDate(compraData.dataCompra);

      // Processar pagamentos
      const pagamentosProcessados = compraData.pagamentos.map(pag => ({
        formaPagamento: pag.formaPagamento,
        valor: pag.valor,
        dataVencimento: parseDate(pag.dataVencimento),
        dataPagamento: pag.dataPagamento ? parseDate(pag.dataPagamento) : undefined,
        observacao: pag.observacao,
        quantidadeParcelas: pag.quantidadeParcelas,
      }));

      return await this.compraService.create({
        nomeFornecedor: compraData.nomeFornecedor,
        dataCompra,
        usuarioId: compraData.usuarioId,
        observacao: compraData.observacao,
        desconto: compraData.desconto || 0,
        itens: compraData.itens,
        pagamentos: pagamentosProcessados,
      });
    } catch (error) {
      this.logger.error(`Erro ao criar compra: ${error.message}`, error.stack);
      // Re-throw para manter os erros específicos (BadRequestException, NotFoundException)
      throw error;
    }
  }

  @Delete(':id')
  async deleteCompra(@Param('id', ParseUUIDPipe) id: string) {
    return this.compraService.delete(id);
  }

  @Get('lancamentos-financeiros')
  async getLancamentosFinanceiros() {
    return this.compraService.getLancamentosFinanceiros();
  }

  @Get('lancamentos-financeiros/compra/:compraId')
  async getLancamentosFinanceirosPorCompra(@Param('compraId', ParseUUIDPipe) compraId: string) {
    return this.compraService.getLancamentosFinanceirosPorCompra(compraId);
  }

  @Get('lancamentos-financeiros/periodo')
  async getLancamentosFinanceirosPorPeriodo(
    @Query('dataInicio') dataInicio: string,
    @Query('dataFim') dataFim: string,
    @Query('tipoLancamento') tipoLancamento?: TipoLancamento,
  ) {
    return this.compraService.getLancamentosFinanceirosPorPeriodo(
      new Date(dataInicio),
      new Date(dataFim),
      tipoLancamento,
    );
  }
}

