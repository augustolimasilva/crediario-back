import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LancamentoFinanceiroService } from './lancamento-financeiro.service';
import { LancamentoFinanceiroController } from './lancamento-financeiro.controller';
import { LancamentoFinanceiro } from '../compra/lancamento-financeiro.entity';
import { Funcionario } from '../funcionario/funcionario.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([LancamentoFinanceiro, Funcionario]),
    AuthModule,
  ],
  controllers: [LancamentoFinanceiroController],
  providers: [LancamentoFinanceiroService],
  exports: [LancamentoFinanceiroService],
})
export class LancamentoFinanceiroModule {}
