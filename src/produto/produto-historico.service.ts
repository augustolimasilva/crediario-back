import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProdutoHistorico, TipoAlteracao } from './produto-historico.entity';
import { CreateProdutoHistoricoDto } from './dto/create-produto-historico.dto';

@Injectable()
export class ProdutoHistoricoService {
  constructor(
    @InjectRepository(ProdutoHistorico)
    private produtoHistoricoRepository: Repository<ProdutoHistorico>,
  ) {}

  async create(createProdutoHistoricoDto: CreateProdutoHistoricoDto): Promise<ProdutoHistorico> {
    const historico = this.produtoHistoricoRepository.create(createProdutoHistoricoDto);
    return await this.produtoHistoricoRepository.save(historico);
  }

  async findByProdutoId(produtoId: string): Promise<ProdutoHistorico[]> {
    return await this.produtoHistoricoRepository.find({
      where: { produtoId },
      relations: ['usuario', 'produto'],
      order: { createdAt: 'DESC' },
    });
  }

  async findAll(): Promise<ProdutoHistorico[]> {
    return await this.produtoHistoricoRepository.find({
      relations: ['produto', 'usuario'],
      order: { createdAt: 'DESC' },
    });
  }

  async registrarAlteracao(
    produtoId: string,
    usuarioId: string,
    tipoAlteracao: TipoAlteracao,
    dadosAnteriores?: Record<string, any>,
    dadosNovos?: Record<string, any>,
    descricao?: string,
    observacao?: string,
  ): Promise<ProdutoHistorico> {
    const createDto: CreateProdutoHistoricoDto = {
      produtoId,
      usuarioId,
      tipoAlteracao,
      dadosAnteriores,
      dadosNovos,
      descricao,
      observacao,
    };

    return await this.create(createDto);
  }

  async registrarCriacao(
    produtoId: string,
    usuarioId: string,
    dadosNovos: Record<string, any>,
  ): Promise<ProdutoHistorico> {
    return await this.registrarAlteracao(
      produtoId,
      usuarioId,
      TipoAlteracao.CRIADO,
      undefined,
      dadosNovos,
      'Produto criado',
    );
  }

  async registrarAtualizacao(
    produtoId: string,
    usuarioId: string,
    dadosAnteriores: Record<string, any>,
    dadosNovos: Record<string, any>,
    camposAlterados: string[],
  ): Promise<ProdutoHistorico> {
    const descricao = `Campos alterados: ${camposAlterados.join(', ')}`;
    
    return await this.registrarAlteracao(
      produtoId,
      usuarioId,
      TipoAlteracao.ATUALIZADO,
      dadosAnteriores,
      dadosNovos,
      descricao,
    );
  }

  async registrarExclusao(
    produtoId: string,
    usuarioId: string,
    dadosAnteriores: Record<string, any>,
  ): Promise<ProdutoHistorico> {
    return await this.registrarAlteracao(
      produtoId,
      usuarioId,
      TipoAlteracao.EXCLUIDO,
      dadosAnteriores,
      undefined,
      'Produto excluído',
    );
  }

  async registrarAtivacao(
    produtoId: string,
    usuarioId: string,
  ): Promise<ProdutoHistorico> {
    return await this.registrarAlteracao(
      produtoId,
      usuarioId,
      TipoAlteracao.ATIVADO,
      { ativo: false },
      { ativo: true },
      'Produto ativado',
    );
  }

  async registrarDesativacao(
    produtoId: string,
    usuarioId: string,
  ): Promise<ProdutoHistorico> {
    return await this.registrarAlteracao(
      produtoId,
      usuarioId,
      TipoAlteracao.DESATIVADO,
      { ativo: true },
      { ativo: false },
      'Produto desativado',
    );
  }
}
