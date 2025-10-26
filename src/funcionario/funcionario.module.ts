import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Funcionario } from './funcionario.entity';
import { Cargo } from '../cargo/cargo.entity';
import { FuncionarioHistorico } from './funcionario-historico.entity';
import { FuncionarioService } from './funcionario.service';
import { FuncionarioController } from './funcionario.controller';
import { FuncionarioHistoricoService } from './funcionario-historico.service';
import { FuncionarioHistoricoController } from './funcionario-historico.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Funcionario, Cargo, FuncionarioHistorico])],
  providers: [FuncionarioService, FuncionarioHistoricoService],
  controllers: [FuncionarioController, FuncionarioHistoricoController],
  exports: [FuncionarioService, FuncionarioHistoricoService],
})
export class FuncionarioModule {}
