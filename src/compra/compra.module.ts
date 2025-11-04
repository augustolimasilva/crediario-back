import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Compra } from './compra.entity';
import { CompraItem } from './compra-item.entity';
import { CompraPagamento } from './compra-pagamento.entity';
import { Estoque } from './estoque.entity';
import { LancamentoFinanceiro } from './lancamento-financeiro.entity';
import { Produto } from '../produto/produto.entity';
import { CompraService } from './compra.service';
import { CompraController } from './compra.controller';
import { AuthModule } from '../auth/auth.module';
import { ProdutoModule } from '../produto/produto.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Compra, CompraItem, CompraPagamento, Estoque, LancamentoFinanceiro, Produto]),
    AuthModule,
    ProdutoModule,
  ],
  providers: [CompraService],
  controllers: [CompraController],
  exports: [CompraService],
})
export class CompraModule {}

