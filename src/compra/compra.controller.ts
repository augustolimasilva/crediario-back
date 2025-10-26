import { Controller, Get, Post, Delete, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { CompraService } from './compra.service';
import { FormaPagamento } from './compra-pagamento.entity';

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


}

