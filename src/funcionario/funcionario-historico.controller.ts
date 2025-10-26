import { Controller, Get, Delete, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { FuncionarioHistoricoService } from './funcionario-historico.service';
import { TipoAlteracao } from './funcionario-historico.entity';

@Controller('funcionario-historico')
export class FuncionarioHistoricoController {
  constructor(private historicoService: FuncionarioHistoricoService) {}

  @Get()
  async getAllHistoricos() {
    return this.historicoService.buscarTodosHistoricos();
  }

  @Get('funcionario/:funcionarioId')
  async getHistoricoByFuncionario(@Param('funcionarioId', ParseUUIDPipe) funcionarioId: string) {
    return this.historicoService.buscarHistoricoPorFuncionario(funcionarioId);
  }

  @Get('tipo/:tipo')
  async getHistoricoByTipo(@Param('tipo') tipo: TipoAlteracao) {
    return this.historicoService.buscarHistoricoPorTipo(tipo);
  }

  @Get('usuario/:usuario')
  async getHistoricoByUsuario(@Param('usuario') usuario: string) {
    return this.historicoService.buscarHistoricoPorUsuario(usuario);
  }

  @Get('periodo')
  async getHistoricoByPeriodo(
    @Query('dataInicio') dataInicio: string,
    @Query('dataFim') dataFim: string,
  ) {
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    return this.historicoService.buscarHistoricoPorPeriodo(inicio, fim);
  }

  @Get(':id')
  async getHistoricoById(@Param('id', ParseUUIDPipe) id: string) {
    return this.historicoService.buscarHistoricoPorId(id);
  }

  @Delete(':id')
  async deleteHistorico(@Param('id', ParseUUIDPipe) id: string) {
    return this.historicoService.deletarHistorico(id);
  }

  @Delete('limpar/antigo')
  async limparHistoricoAntigo(@Query('dias') dias?: number) {
    const diasParaManter = dias || 365;
    const registrosRemovidos = await this.historicoService.limparHistoricoAntigo(diasParaManter);
    return {
      message: `Histórico antigo limpo com sucesso`,
      registrosRemovidos,
      diasParaManter,
    };
  }
}
