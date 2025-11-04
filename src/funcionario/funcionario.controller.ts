import { Controller, Get, Post, Put, Delete, Body, Param, ParseUUIDPipe, Query, HttpException, HttpStatus } from '@nestjs/common';
import { FuncionarioService } from './funcionario.service';

@Controller('funcionario')
export class FuncionarioController {
  constructor(private funcionarioService: FuncionarioService) {}

  @Get()
  async getAllFuncionarios(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.funcionarioService.findAll(Number(page) || 1, Number(pageSize) || 20);
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
    salario?: number | string;
    comissao?: number; // Campo ignorado mas aceito para compatibilidade
  }) {
    try {
      // Remover comissao dos dados se presente
      const { comissao, ...dataWithoutComissao } = funcionarioData;
      
      // Processar salário: converter para number ou remover se vazio
      const salarioValue = dataWithoutComissao.salario as any;
      if (salarioValue === null || 
          salarioValue === undefined || 
          salarioValue === '' ||
          (typeof salarioValue === 'string' && salarioValue.trim() === '')) {
        delete dataWithoutComissao.salario;
      } else {
        const salarioNum = Number(salarioValue);
        if (isNaN(salarioNum)) {
          delete dataWithoutComissao.salario;
        } else {
          // Garantir que seja um número válido e positivo
          dataWithoutComissao.salario = Math.max(0, salarioNum);
        }
      }
      
      // Converter strings vazias para null em campos com unique constraint
      // para evitar violação de constraints no banco de dados
      if (dataWithoutComissao.cpf !== undefined && 
          (dataWithoutComissao.cpf === '' || (typeof dataWithoutComissao.cpf === 'string' && dataWithoutComissao.cpf.trim() === ''))) {
        (dataWithoutComissao as any).cpf = null;
      }
      
      if (dataWithoutComissao.email !== undefined && 
          (dataWithoutComissao.email === '' || (typeof dataWithoutComissao.email === 'string' && dataWithoutComissao.email.trim() === ''))) {
        (dataWithoutComissao as any).email = null;
      }
      
      // Converter outras strings vazias para null
      const fieldsToConvert = ['telefone', 'cep', 'endereco', 'numero', 'bairro', 'cidade', 'estado', 'pais'];
      fieldsToConvert.forEach(field => {
        if (dataWithoutComissao[field] !== undefined && 
            (dataWithoutComissao[field] === '' || (typeof dataWithoutComissao[field] === 'string' && dataWithoutComissao[field].trim() === ''))) {
          (dataWithoutComissao as any)[field] = null;
        }
      });
      
      return await this.funcionarioService.create(dataWithoutComissao as any);
    } catch (error) {
      console.error('Erro ao criar funcionário no backend:', error);
      console.error('Stack trace:', error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Erro ao criar funcionário',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
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
      salario?: number | string;
      comissao?: number; // Campo ignorado mas aceito para compatibilidade
    }
  ) {
      try {
      // Remover comissao dos dados se presente
      const { comissao, ...dataWithoutComissao } = updateData;
      
      // Processar salário: converter para number ou remover se vazio
      const salarioValue = dataWithoutComissao.salario as any;
      if (salarioValue === null || 
          salarioValue === undefined || 
          salarioValue === '' ||
          (typeof salarioValue === 'string' && salarioValue.trim() === '')) {
        delete dataWithoutComissao.salario;
      } else {
        const salarioNum = Number(salarioValue);
        if (isNaN(salarioNum)) {
          delete dataWithoutComissao.salario;
        } else {
          // Garantir que seja um número válido e positivo
          dataWithoutComissao.salario = Math.max(0, salarioNum);
        }
      }
      
      // Converter strings vazias para null em campos com unique constraint
      // para evitar violação de constraints no banco de dados
      if (dataWithoutComissao.cpf !== undefined && 
          (dataWithoutComissao.cpf === '' || (typeof dataWithoutComissao.cpf === 'string' && dataWithoutComissao.cpf.trim() === ''))) {
        (dataWithoutComissao as any).cpf = null;
      }
      
      if (dataWithoutComissao.email !== undefined && 
          (dataWithoutComissao.email === '' || (typeof dataWithoutComissao.email === 'string' && dataWithoutComissao.email.trim() === ''))) {
        (dataWithoutComissao as any).email = null;
      }
      
      // Converter outras strings vazias para null
      const fieldsToConvert = ['telefone', 'cep', 'endereco', 'numero', 'bairro', 'cidade', 'estado', 'pais'];
      fieldsToConvert.forEach(field => {
        if (dataWithoutComissao[field] !== undefined && 
            (dataWithoutComissao[field] === '' || (typeof dataWithoutComissao[field] === 'string' && dataWithoutComissao[field].trim() === ''))) {
          (dataWithoutComissao as any)[field] = null;
        }
      });
      
      
      return await this.funcionarioService.update(id, dataWithoutComissao as any);
    } catch (error) {
      console.error('Erro ao atualizar funcionário no backend:', error);
      console.error('Erro completo:', JSON.stringify(error, null, 2));
      console.error('Stack trace:', error.stack);
      if (error instanceof HttpException) {
        throw error;
      }
      // Retornar mensagem de erro mais detalhada
      const errorMessage = error?.message || 'Erro ao atualizar funcionário';
      const errorStatus = error?.status || HttpStatus.INTERNAL_SERVER_ERROR;
      console.error('Lançando HttpException:', errorMessage, errorStatus);
      throw new HttpException(errorMessage, errorStatus);
    }
  }

  @Delete(':id')
  async deleteFuncionario(@Param('id', ParseUUIDPipe) id: string) {
    return this.funcionarioService.delete(id);
  }
}
