import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FuncionarioHistorico, TipoAlteracao } from './funcionario-historico.entity';
import { Funcionario } from './funcionario.entity';

@Injectable()
export class FuncionarioHistoricoService {
  constructor(
    @InjectRepository(FuncionarioHistorico)
    private historicoRepository: Repository<FuncionarioHistorico>,
  ) {}

  async criarHistorico(
    funcionarioId: string,
    tipoAlteracao: TipoAlteracao,
    dadosAnteriores: any = null,
    dadosNovos: any = null,
    usuarioAlteracao?: string,
    ipAlteracao?: string,
    userAgent?: string,
    observacoes?: string,
  ): Promise<FuncionarioHistorico> {
    const historico = this.historicoRepository.create({
      funcionarioId,
      tipoAlteracao,
      dadosAnteriores,
      dadosNovos,
      usuarioAlteracao,
      ipAlteracao,
      userAgent,
      observacoes,
    });

    return this.historicoRepository.save(historico);
  }

  async buscarHistoricoPorFuncionario(funcionarioId: string): Promise<FuncionarioHistorico[]> {
    return this.historicoRepository.find({
      where: { funcionarioId },
      relations: ['funcionario', 'funcionario.cargo'],
      order: { dataAlteracao: 'DESC' },
    });
  }

  async buscarTodosHistoricos(): Promise<FuncionarioHistorico[]> {
    return this.historicoRepository.find({
      relations: ['funcionario', 'funcionario.cargo'],
      order: { dataAlteracao: 'DESC' },
    });
  }

  async buscarHistoricoPorId(id: string): Promise<FuncionarioHistorico | null> {
    return this.historicoRepository.findOne({
      where: { id },
      relations: ['funcionario', 'funcionario.cargo'],
    });
  }

  async buscarHistoricoPorTipo(tipoAlteracao: TipoAlteracao): Promise<FuncionarioHistorico[]> {
    return this.historicoRepository.find({
      where: { tipoAlteracao },
      relations: ['funcionario', 'funcionario.cargo'],
      order: { dataAlteracao: 'DESC' },
    });
  }

  async buscarHistoricoPorPeriodo(
    dataInicio: Date,
    dataFim: Date,
  ): Promise<FuncionarioHistorico[]> {
    return this.historicoRepository
      .createQueryBuilder('historico')
      .leftJoinAndSelect('historico.funcionario', 'funcionario')
      .where('historico.dataAlteracao BETWEEN :dataInicio AND :dataFim', {
        dataInicio,
        dataFim,
      })
      .orderBy('historico.dataAlteracao', 'DESC')
      .getMany();
  }

  async buscarHistoricoPorUsuario(usuarioAlteracao: string): Promise<FuncionarioHistorico[]> {
    return this.historicoRepository.find({
      where: { usuarioAlteracao },
      relations: ['funcionario', 'funcionario.cargo'],
      order: { dataAlteracao: 'DESC' },
    });
  }

  async deletarHistorico(id: string): Promise<void> {
    await this.historicoRepository.delete(id);
  }

  async limparHistoricoAntigo(diasParaManter: number = 365): Promise<number> {
    const dataLimite = new Date();
    dataLimite.setDate(dataLimite.getDate() - diasParaManter);

    const result = await this.historicoRepository
      .createQueryBuilder()
      .delete()
      .where('dataAlteracao < :dataLimite', { dataLimite })
      .execute();

    return result.affected || 0;
  }
}
