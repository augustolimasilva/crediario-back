import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Produto, ClassificacaoProduto } from './produto.entity';
import { ProdutoHistoricoService } from './produto-historico.service';

@Injectable()
export class ProdutoService {
  constructor(
    @InjectRepository(Produto)
    private produtoRepository: Repository<Produto>,
    private produtoHistoricoService: ProdutoHistoricoService,
  ) {}

  async findAll(page: number = 1, pageSize: number = 20): Promise<{ data: Produto[]; total: number; page: number; pageSize: number }> {
    const take = Math.max(1, Math.min(pageSize, 200));
    const skip = Math.max(0, (Math.max(1, page) - 1) * take);

    const [data, total] = await this.produtoRepository.findAndCount({
      order: { nome: 'ASC' },
      skip,
      take,
    });

    return { data, total, page: Math.max(1, page), pageSize: take };
  }

  async findById(id: string): Promise<Produto | null> {
    return this.produtoRepository.findOne({ 
      where: { id }
    });
  }

  async create(produtoData: {
    nome: string;
    descricao?: string;
    marca?: string;
    cor?: string;
    valor: number;
    percentualComissao?: number;
    classificacao?: ClassificacaoProduto;
    temEstoque: boolean;
    quantidadeMinimaEstoque: number;
    ativo?: boolean;
    usuarioId?: string;
  }): Promise<Produto> {
    // Validar valor
    if (produtoData.valor < 0) {
      throw new Error('Valor não pode ser negativo');
    }

    // Validar quantidade mínima de estoque se temEstoque for true
    if (produtoData.temEstoque && (produtoData.quantidadeMinimaEstoque < 0 || produtoData.quantidadeMinimaEstoque > 100)) {
      throw new Error('Quantidade mínima de estoque deve estar entre 0 e 100 quando tem estoque');
    }

    // Remover usuarioId dos dados antes de criar a entidade
    const { usuarioId, ...dadosProduto } = produtoData;
    
    const produto = this.produtoRepository.create({
      ...dadosProduto,
      ativo: dadosProduto.ativo !== undefined ? dadosProduto.ativo : true
    });
    
    const produtoSalvo = await this.produtoRepository.save(produto);
    
    // Registrar no histórico se usuarioId foi fornecido
    if (produtoData.usuarioId) {
      await this.produtoHistoricoService.registrarCriacao(
        produtoSalvo.id,
        produtoData.usuarioId,
        {
          nome: produtoSalvo.nome,
          descricao: produtoSalvo.descricao,
          marca: produtoSalvo.marca,
          cor: produtoSalvo.cor,
          valor: produtoSalvo.valor,
          percentualComissao: produtoSalvo.percentualComissao,
          classificacao: produtoSalvo.classificacao,
          temEstoque: produtoSalvo.temEstoque,
          quantidadeMinimaEstoque: produtoSalvo.quantidadeMinimaEstoque,
          ativo: produtoSalvo.ativo,
        }
      );
    }
    
    return produtoSalvo;
  }

  async update(id: string, updateData: {
    nome?: string;
    descricao?: string;
    marca?: string;
    cor?: string;
    valor?: number;
    percentualComissao?: number;
    classificacao?: ClassificacaoProduto;
    temEstoque?: boolean;
    quantidadeMinimaEstoque?: number;
    ativo?: boolean;
    usuarioId?: string;
  }): Promise<Produto> {
    // Validar valor se fornecido
    if (updateData.valor !== undefined && updateData.valor < 0) {
      throw new Error('Valor não pode ser negativo');
    }

    // Validar quantidade mínima de estoque se temEstoque for true
    if (updateData.temEstoque && updateData.quantidadeMinimaEstoque !== undefined) {
      if (updateData.quantidadeMinimaEstoque < 0 || updateData.quantidadeMinimaEstoque > 100) {
        throw new Error('Quantidade mínima de estoque deve estar entre 0 e 100 quando tem estoque');
      }
    }

    // Buscar dados anteriores para o histórico
    const produtoAnterior = await this.findById(id);
    if (!produtoAnterior) {
      throw new Error('Produto not found');
    }

    // Remover usuarioId dos dados de atualização antes de salvar no banco
    const { usuarioId, ...dadosParaAtualizar } = updateData;
    
    await this.produtoRepository.update(id, dadosParaAtualizar);
    const produto = await this.findById(id);
    if (!produto) {
      throw new Error('Produto not found');
    }

    // Registrar no histórico se usuarioId foi fornecido
    if (updateData.usuarioId) {
      const camposAlterados: string[] = [];
      const dadosAnteriores: Record<string, any> = {};
      const dadosNovos: Record<string, any> = {};

      // Verificar quais campos foram alterados
      Object.keys(updateData).forEach(key => {
        if (key !== 'usuarioId' && updateData[key] !== undefined) {
          const valorAnterior = produtoAnterior[key];
          const valorNovo = produto[key];
          
          if (valorAnterior !== valorNovo) {
            camposAlterados.push(key);
            dadosAnteriores[key] = valorAnterior;
            dadosNovos[key] = valorNovo;
          }
        }
      });

      if (camposAlterados.length > 0) {
        await this.produtoHistoricoService.registrarAtualizacao(
          id,
          updateData.usuarioId,
          dadosAnteriores,
          dadosNovos,
          camposAlterados,
        );
      }
    }

    return produto;
  }

  async delete(id: string, usuarioId?: string): Promise<void> {
    // Buscar dados do produto antes de excluir para o histórico
    const produto = await this.findById(id);
    if (!produto) {
      throw new Error('Produto not found');
    }

    const result = await this.produtoRepository.delete(id);
    if (result.affected === 0) {
      throw new Error('Produto not found');
    }

    // Registrar no histórico se usuarioId foi fornecido
    if (usuarioId) {
      await this.produtoHistoricoService.registrarExclusao(
        id,
        usuarioId,
        {
          nome: produto.nome,
          descricao: produto.descricao,
          marca: produto.marca,
          cor: produto.cor,
          valor: produto.valor,
          temEstoque: produto.temEstoque,
          quantidadeMinimaEstoque: produto.quantidadeMinimaEstoque,
          ativo: produto.ativo,
        }
      );
    }
  }

  async toggleAtivo(id: string, usuarioId?: string): Promise<Produto> {
    const produto = await this.findById(id);
    if (!produto) {
      throw new Error('Produto not found');
    }
    
    const ativoAnterior = produto.ativo;
    produto.ativo = !produto.ativo;
    const produtoSalvo = await this.produtoRepository.save(produto);

    // Registrar no histórico se usuarioId foi fornecido
    if (usuarioId) {
      if (produtoSalvo.ativo) {
        await this.produtoHistoricoService.registrarAtivacao(id, usuarioId);
      } else {
        await this.produtoHistoricoService.registrarDesativacao(id, usuarioId);
      }
    }

    return produtoSalvo;
  }
}

