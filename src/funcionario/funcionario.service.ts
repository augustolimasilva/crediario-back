import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Funcionario } from './funcionario.entity';
import { Cargo } from '../cargo/cargo.entity';
import { FuncionarioHistoricoService } from './funcionario-historico.service';
import { TipoAlteracao } from './funcionario-historico.entity';

@Injectable()
export class FuncionarioService {
  constructor(
    @InjectRepository(Funcionario)
    private funcionarioRepository: Repository<Funcionario>,
    @InjectRepository(Cargo)
    private cargoRepository: Repository<Cargo>,
    private historicoService: FuncionarioHistoricoService,
  ) {}

  async findAll(page: number = 1, pageSize: number = 20): Promise<{ data: Funcionario[]; total: number; page: number; pageSize: number }> {
    const take = Math.max(1, Math.min(pageSize, 200));
    const skip = Math.max(0, (Math.max(1, page) - 1) * take);
    const [data, total] = await this.funcionarioRepository.findAndCount({
      relations: ['cargo'],
      order: { nome: 'ASC' },
      skip,
      take,
    });
    return { data, total, page: Math.max(1, page), pageSize: take };
  }

  async findById(id: string): Promise<Funcionario | null> {
    return this.funcionarioRepository.findOne({ 
      where: { id },
      relations: ['cargo']
    });
  }

  async create(funcionarioData: {
    nome: string;
    telefone?: string;
    cep?: string;
    endereco?: string;
    numero?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    pais?: string;
    cpf?: string | null;
    email?: string | null;
    cargoId: string;
    salario?: number;
  }): Promise<Funcionario> {
    // Verificar se o cargo existe
    const cargo = await this.cargoRepository.findOne({ where: { id: funcionarioData.cargoId } });
    if (!cargo) {
      throw new HttpException('Cargo não encontrado', HttpStatus.NOT_FOUND);
    }

    // Validar CPF se fornecido e não for null
    if (funcionarioData.cpf !== null && funcionarioData.cpf !== undefined && funcionarioData.cpf !== '' && !this.isValidCPF(funcionarioData.cpf)) {
      throw new HttpException('CPF inválido', HttpStatus.BAD_REQUEST);
    }

    // Validar email se fornecido e não for null
    if (funcionarioData.email !== null && funcionarioData.email !== undefined && funcionarioData.email !== '' && !this.isValidEmail(funcionarioData.email)) {
      throw new HttpException('Email inválido', HttpStatus.BAD_REQUEST);
    }

    // Criar objeto limpo removendo undefined mas mantendo null
    const cleanData: any = {};
    Object.keys(funcionarioData).forEach(key => {
      if (funcionarioData[key] !== undefined) {
        cleanData[key] = funcionarioData[key];
      }
    });

    const funcionario = this.funcionarioRepository.create(cleanData);
    let funcionarioSalvo: Funcionario;
    try {
      const resultado = await this.funcionarioRepository.save(funcionario);
      funcionarioSalvo = Array.isArray(resultado) ? resultado[0] : resultado;
    } catch (error) {
      console.error('Erro ao salvar funcionário no banco:', error);
      // Verificar se é erro de constraint única
      if (error.code === '23505' || error.message?.includes('unique') || error.message?.includes('duplicate')) {
        throw new HttpException('CPF ou Email já cadastrado', HttpStatus.CONFLICT);
      }
      throw new HttpException(
        error.message || 'Erro ao criar funcionário',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

     try {
       const dadosSerializados = this.serializeFuncionarioForHistory(funcionarioSalvo);
       await this.historicoService.criarHistorico(
         funcionarioSalvo.id,
         TipoAlteracao.CREATE,
         null,
         dadosSerializados,
         'Sistema',
         '127.0.0.1',
         'Sistema',
         'Funcionário criado via sistema',
       );
     } catch (historicoError) {
       console.error('Erro ao criar histórico, mas funcionário foi criado:', historicoError);
       // Não falhar a criação do funcionário por causa do histórico
     }

    return funcionarioSalvo;
  }

  async update(id: string, updateData: {
    nome?: string;
    telefone?: string;
    cep?: string;
    endereco?: string;
    numero?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    pais?: string;
    cpf?: string | null;
    email?: string | null;
    cargoId?: string;
    salario?: number;
  }): Promise<Funcionario> {
    // Validar CPF se fornecido e não for null
    if (updateData.cpf !== null && updateData.cpf !== undefined && updateData.cpf !== '' && !this.isValidCPF(updateData.cpf)) {
      throw new HttpException('CPF inválido', HttpStatus.BAD_REQUEST);
    }

    // Validar email se fornecido e não for null
    if (updateData.email !== null && updateData.email !== undefined && updateData.email !== '' && !this.isValidEmail(updateData.email)) {
      throw new HttpException('Email inválido', HttpStatus.BAD_REQUEST);
    }

    // Verificar se o cargo existe se fornecido
    if (updateData.cargoId) {
      const cargo = await this.cargoRepository.findOne({ where: { id: updateData.cargoId } });
      if (!cargo) {
        throw new HttpException('Cargo não encontrado', HttpStatus.NOT_FOUND);
      }
    }

    // Verificar se o funcionário existe e buscar dados anteriores para o histórico
    const funcionarioAnterior = await this.findById(id);
    if (!funcionarioAnterior) {
      throw new HttpException('Funcionário não encontrado', HttpStatus.NOT_FOUND);
    }

    // Criar objeto limpo removendo undefined e null (não atualizar campos null)
    const cleanUpdateData: any = {};
    Object.keys(updateData).forEach(key => {
      const value = updateData[key];
      // Incluir apenas valores definidos E não-null (para limpar um campo, não envie null, apenas omita ou delete)
      if (value !== undefined && value !== null) {
        cleanUpdateData[key] = value;
      }
      // Se o valor for explicitamente null E o campo permite null (cpf, email), então setar como null
      // Para outros campos, apenas omitir se for null
      else if (value === null && (key === 'cpf' || key === 'email')) {
        cleanUpdateData[key] = null;
      }
    });

    try {
      await this.funcionarioRepository.update(id, cleanUpdateData);
    } catch (error) {
      console.error('========== ERRO AO ATUALIZAR NO BANCO ==========');
      console.error('Erro:', error);
      console.error('Código do erro:', error?.code);
      console.error('Mensagem:', error?.message);
      console.error('Stack:', error?.stack);
      console.error('===============================================');
      // Verificar se é erro de constraint única
      if (error?.code === '23505' || error?.message?.includes('unique') || error?.message?.includes('duplicate')) {
        throw new HttpException('CPF ou Email já cadastrado', HttpStatus.CONFLICT);
      }
      throw new HttpException(
        error?.message || 'Erro ao atualizar funcionário no banco de dados',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    
    const funcionarioAtualizado = await this.findById(id);
    if (!funcionarioAtualizado) {
      throw new HttpException('Funcionário não encontrado após atualização', HttpStatus.NOT_FOUND);
    }

    // Criar histórico de atualização
    try {
      const dadosAnterioresSerializados = this.serializeFuncionarioForHistory(funcionarioAnterior);
      const dadosNovosSerializados = this.serializeFuncionarioForHistory(funcionarioAtualizado);
      await this.historicoService.criarHistorico(
        id,
        TipoAlteracao.UPDATE,
        dadosAnterioresSerializados,
        dadosNovosSerializados,
        'Sistema',
        '127.0.0.1',
        'Sistema',
        'Funcionário atualizado via sistema',
      );
    } catch (historicoError) {
      console.error('Erro ao criar histórico, mas funcionário foi atualizado:', historicoError);
      // Não falhar a atualização do funcionário por causa do histórico
    }

    return funcionarioAtualizado;
  }

  async delete(id: string): Promise<void> {
    // Buscar dados do funcionário antes de deletar para o histórico
    const funcionario = await this.findById(id);
    if (!funcionario) {
      throw new Error('Funcionario not found');
    }

    const result = await this.funcionarioRepository.delete(id);
    if (result.affected === 0) {
      throw new Error('Funcionario not found');
    }

    // Criar histórico de exclusão
    await this.historicoService.criarHistorico(
      id,
      TipoAlteracao.DELETE,
      funcionario,
      null,
      'Sistema',
      '127.0.0.1',
      'Sistema',
      'Funcionário excluído via sistema',
    );
  }

  private isValidCPF(cpf: string): boolean {
    // Remove caracteres não numéricos
    cpf = cpf.replace(/\D/g, '');
    
    // Verifica se tem 11 dígitos
    if (cpf.length !== 11) return false;
    
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1{10}$/.test(cpf)) return false;
    
    // Validação do CPF
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let remainder = 11 - (sum % 11);
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    remainder = 11 - (sum % 11);
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(10))) return false;
    
    return true;
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
    return emailRegex.test(email);
  }

  private serializeFuncionarioForHistory(funcionario: Funcionario | null): any {
    if (!funcionario) return null;
    
    try {
      // Serializar apenas os dados necessários, sem relações circulares
      const serialized: any = {
        id: funcionario.id,
        nome: funcionario.nome,
        telefone: funcionario.telefone,
        cep: funcionario.cep,
        endereco: funcionario.endereco,
        numero: funcionario.numero,
        bairro: funcionario.bairro,
        cidade: funcionario.cidade,
        estado: funcionario.estado,
        pais: funcionario.pais,
        cpf: funcionario.cpf,
        email: funcionario.email,
        cargoId: funcionario.cargoId,
        salario: funcionario.salario,
        comissao: funcionario.comissao,
        createdAt: funcionario.createdAt,
        updatedAt: funcionario.updatedAt,
      };
      
      // Incluir dados do cargo se existir, mas sem relações
      if (funcionario.cargo && typeof funcionario.cargo === 'object') {
        serialized.cargo = {
          id: funcionario.cargo.id,
          descricao: funcionario.cargo.descricao || null,
        };
      } else {
        serialized.cargo = null;
      }
      
      return serialized;
    } catch (error) {
      console.error('Erro ao serializar funcionário para histórico:', error);
      // Retornar dados básicos se houver erro na serialização completa
      return {
        id: funcionario.id,
        nome: funcionario.nome,
        cargoId: funcionario.cargoId,
      };
    }
  }
}
