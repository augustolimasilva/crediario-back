import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Venda } from './venda.entity';
import { VendaItem } from './venda-item.entity';
import { VendaPagamento } from './venda-pagamento.entity';
import { Estoque } from '../compra/estoque.entity';
import { LancamentoFinanceiro } from '../compra/lancamento-financeiro.entity';
import { Produto } from '../produto/produto.entity';
import { Funcionario } from '../funcionario/funcionario.entity';
import { User } from '../user/user.entity';
import { VendaService } from './venda.service';
import { VendaController } from './venda.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Venda, VendaItem, VendaPagamento, Estoque, LancamentoFinanceiro, Produto, Funcionario, User]),
    AuthModule,
  ],
  providers: [VendaService],
  controllers: [VendaController],
  exports: [VendaService],
})
export class VendaModule {}


