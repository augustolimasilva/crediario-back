import { Controller, Get, Post, Put, Delete, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { FuncionarioService } from './funcionario.service';

@Controller('funcionario')
export class FuncionarioController {
  constructor(private funcionarioService: FuncionarioService) {}

  @Get()
  async getAllFuncionarios() {
    return this.funcionarioService.findAll();
  }

  @Get(':id')
  async getFuncionarioById(@Param('id', ParseUUIDPipe) id: string) {
    return this.funcionarioService.findById(id);
  }

  @Post()
  async createFuncionario(@Body() funcionarioData: {
    nome: string;
    telefone?: string;
    cep?: string;
    endereco?: string;
    numero?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    pais?: string;
    cpf?: string;
    email?: string;
    cargoId: string;
    comissao?: number; // Campo ignorado mas aceito para compatibilidade
  }) {
    // Remover comissao dos dados se presente
    const { comissao, ...dataWithoutComissao } = funcionarioData;
    return this.funcionarioService.create(dataWithoutComissao);
  }

  @Put(':id')
  async updateFuncionario(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateData: {
      nome?: string;
      telefone?: string;
      cep?: string;
      endereco?: string;
      numero?: string;
      bairro?: string;
      cidade?: string;
      estado?: string;
      pais?: string;
      cpf?: string;
      email?: string;
      cargoId?: string;
      comissao?: number; // Campo ignorado mas aceito para compatibilidade
    }
  ) {
    // Remover comissao dos dados se presente
    const { comissao, ...dataWithoutComissao } = updateData;
    return this.funcionarioService.update(id, dataWithoutComissao);
  }

  @Delete(':id')
  async deleteFuncionario(@Param('id', ParseUUIDPipe) id: string) {
    return this.funcionarioService.delete(id);
  }
}
