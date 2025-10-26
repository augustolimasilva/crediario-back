import { Injectable } from '@nestjs/common';
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

  async findAll(): Promise<Funcionario[]> {
    return this.funcionarioRepository.find({
      relations: ['cargo'],
      order: { nome: 'ASC' }
    });
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
    cpf?: string;
    email?: string;
    cargoId: string;
  }): Promise<Funcionario> {
    // Verificar se o cargo existe
    const cargo = await this.cargoRepository.findOne({ where: { id: funcionarioData.cargoId } });
    if (!cargo) {
      throw new Error('Cargo not found');
    }

    // Validar CPF se fornecido
    if (funcionarioData.cpf && !this.isValidCPF(funcionarioData.cpf)) {
      throw new Error('CPF inválido');
    }

    // Validar email se fornecido
    if (funcionarioData.email && !this.isValidEmail(funcionarioData.email)) {
      throw new Error('Email inválido');
    }


    const funcionario = this.funcionarioRepository.create(funcionarioData);
    const funcionarioSalvo = await this.funcionarioRepository.save(funcionario);

    // Criar histórico de criação
    await this.historicoService.criarHistorico(
      funcionarioSalvo.id,
      TipoAlteracao.CREATE,
      null,
      funcionarioSalvo,
      'Sistema',
      '127.0.0.1',
      'Sistema',
      'Funcionário criado via sistema',
    );

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
    cpf?: string;
    email?: string;
    cargoId?: string;
  }): Promise<Funcionario> {
    // Validar CPF se fornecido
    if (updateData.cpf && !this.isValidCPF(updateData.cpf)) {
      throw new Error('CPF inválido');
    }

    // Validar email se fornecido
    if (updateData.email && !this.isValidEmail(updateData.email)) {
      throw new Error('Email inválido');
    }


    // Verificar se o cargo existe se fornecido
    if (updateData.cargoId) {
      const cargo = await this.cargoRepository.findOne({ where: { id: updateData.cargoId } });
      if (!cargo) {
        throw new Error('Cargo not found');
      }
    }

    // Buscar dados anteriores para o histórico
    const funcionarioAnterior = await this.findById(id);
    if (!funcionarioAnterior) {
      throw new Error('Funcionario not found');
    }

    await this.funcionarioRepository.update(id, updateData);
    const funcionarioAtualizado = await this.findById(id);
    if (!funcionarioAtualizado) {
      throw new Error('Funcionario not found');
    }

    // Criar histórico de atualização
    await this.historicoService.criarHistorico(
      id,
      TipoAlteracao.UPDATE,
      funcionarioAnterior,
      funcionarioAtualizado,
      'Sistema',
      '127.0.0.1',
      'Sistema',
      'Funcionário atualizado via sistema',
    );

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
}
