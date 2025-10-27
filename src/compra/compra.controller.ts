import { Controller, Get, Post, Delete, Body, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { CompraService } from './compra.service';
import { FormaPagamento } from './compra-pagamento.entity';
import { TipoLancamento } from './lancamento-financeiro.entity';

@Controller('compra')
export class CompraController {
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
  async getAllCompras() {
    return this.compraService.findAll();
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
      }>;
    },
  ) {
    return this.compraService.create({
      nomeFornecedor: compraData.nomeFornecedor,
      dataCompra: new Date(compraData.dataCompra),
      usuarioId: compraData.usuarioId,
      observacao: compraData.observacao,
      itens: compraData.itens,
      pagamentos: compraData.pagamentos.map(pag => ({
        formaPagamento: pag.formaPagamento,
        valor: pag.valor,
        dataVencimento: new Date(pag.dataVencimento),
        dataPagamento: pag.dataPagamento ? new Date(pag.dataPagamento) : undefined,
        observacao: pag.observacao,
      })),
    });
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

