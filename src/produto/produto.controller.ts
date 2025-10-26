import { Controller, Get, Post, Put, Delete, Body, Param, ParseUUIDPipe, Patch } from '@nestjs/common';
import { ProdutoService } from './produto.service';

@Controller('produto')
export class ProdutoController {
  constructor(private produtoService: ProdutoService) {}

  @Get()
  async getAllProdutos() {
    return this.produtoService.findAll();
  }

  @Get(':id')
  async getProdutoById(@Param('id', ParseUUIDPipe) id: string) {
    return this.produtoService.findById(id);
  }

  @Post()
  async createProduto(@Body() produtoData: {
    nome: string;
    descricao?: string;
    marca?: string;
    cor?: string;
    valorVenda: number;
    quantidadeMinimaEstoque: number;
    ativo?: boolean;
  }) {
    return this.produtoService.create(produtoData);
  }

  @Put(':id')
  async updateProduto(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateData: {
      nome?: string;
      descricao?: string;
      marca?: string;
      cor?: string;
      valorVenda?: number;
      quantidadeMinimaEstoque?: number;
      ativo?: boolean;
    }
  ) {
    return this.produtoService.update(id, updateData);
  }

  @Delete(':id')
  async deleteProduto(@Param('id', ParseUUIDPipe) id: string) {
    return this.produtoService.delete(id);
  }

  @Patch(':id/toggle-ativo')
  async toggleAtivo(@Param('id', ParseUUIDPipe) id: string) {
    return this.produtoService.toggleAtivo(id);
  }
}

