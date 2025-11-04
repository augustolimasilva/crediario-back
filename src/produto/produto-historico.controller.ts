import { Controller, Get, Param, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ProdutoHistoricoService } from './produto-historico.service';

@Controller('produto-historico')
// @UseGuards(JwtAuthGuard) // Temporariamente removido para debug
export class ProdutoHistoricoController {
  constructor(private readonly produtoHistoricoService: ProdutoHistoricoService) {}

  @Get()
  async findAll() {
    return await this.produtoHistoricoService.findAll();
  }

  @Get('produto/:produtoId')
  async findByProdutoId(@Param('produtoId', ParseUUIDPipe) produtoId: string) {
    return await this.produtoHistoricoService.findByProdutoId(produtoId);
  }
}
