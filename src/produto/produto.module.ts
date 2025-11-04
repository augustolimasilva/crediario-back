import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Produto } from './produto.entity';
import { ProdutoHistorico } from './produto-historico.entity';
import { ProdutoService } from './produto.service';
import { ProdutoController } from './produto.controller';
import { ProdutoHistoricoService } from './produto-historico.service';
import { ProdutoHistoricoController } from './produto-historico.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Produto, ProdutoHistorico]),
    UserModule,
  ],
  providers: [ProdutoService, ProdutoHistoricoService],
  controllers: [ProdutoController, ProdutoHistoricoController],
  exports: [ProdutoService, ProdutoHistoricoService],
})
export class ProdutoModule {}

