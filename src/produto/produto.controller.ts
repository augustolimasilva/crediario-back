import { Controller, Get, Post, Put, Delete, Body, Param, ParseUUIDPipe, Patch, UseGuards, Request, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProdutoService } from './produto.service';
import { ClassificacaoProduto } from './produto.entity';

@Controller('produto')
@UseGuards(JwtAuthGuard)
export class ProdutoController {
  constructor(private produtoService: ProdutoService) {}

  @Get()
  async getAllProdutos(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.produtoService.findAll(Number(page) || 1, Number(pageSize) || 20);
  }

  @Get(':id')
  async getProdutoById(@Param('id', ParseUUIDPipe) id: string) {
    return this.produtoService.findById(id);
  }

  @Post()
  async createProduto(
    @Request() req: any,
    @Body() produtoData: {
      nome: string;
      descricao?: string;
      marca?: string;
      cor?: string;
      valor: number;
      percentualComissao?: number;
      classificacao?: string;
      temEstoque: boolean;
      quantidadeMinimaEstoque: number;
      ativo?: boolean;
    }
  ) {
    const payload: any = { ...produtoData };
    if (payload.classificacao) {
      payload.classificacao = payload.classificacao as ClassificacaoProduto;
    }
    return this.produtoService.create({
      ...payload,
      usuarioId: req.user?.id,
    });
  }

  @Put(':id')
  async updateProduto(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateData: {
      nome?: string;
      descricao?: string;
      marca?: string;
      cor?: string;
      valor?: number;
      percentualComissao?: number;
      classificacao?: string;
      temEstoque?: boolean;
      quantidadeMinimaEstoque?: number;
      ativo?: boolean;
    }
  ) {
    const payload: any = { ...updateData };
    if (payload.classificacao) {
      payload.classificacao = payload.classificacao as ClassificacaoProduto;
    }
    return this.produtoService.update(id, {
      ...payload,
      usuarioId: req.user?.id,
    });
  }

  @Delete(':id')
  async deleteProduto(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return this.produtoService.delete(id, req.user?.id);
  }

  @Patch(':id/toggle-ativo')
  async toggleAtivo(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string
  ) {
    return this.produtoService.toggleAtivo(id, req.user?.id);
  }
}

