import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Produto } from './produto.entity';

@Injectable()
export class ProdutoService {
  constructor(
    @InjectRepository(Produto)
    private produtoRepository: Repository<Produto>,
  ) {}

  async findAll(): Promise<Produto[]> {
    return this.produtoRepository.find({
      order: { nome: 'ASC' }
    });
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
    valorVenda: number;
    quantidadeMinimaEstoque: number;
    ativo?: boolean;
  }): Promise<Produto> {
    // Validar valor de venda
    if (produtoData.valorVenda < 0) {
      throw new Error('Valor de venda não pode ser negativo');
    }

    // Validar quantidade mínima de estoque
    if (produtoData.quantidadeMinimaEstoque < 0 || produtoData.quantidadeMinimaEstoque > 100) {
      throw new Error('Quantidade mínima de estoque deve estar entre 0 e 100');
    }

    const produto = this.produtoRepository.create({
      ...produtoData,
      ativo: produtoData.ativo !== undefined ? produtoData.ativo : true
    });
    return this.produtoRepository.save(produto);
  }

  async update(id: string, updateData: {
    nome?: string;
    descricao?: string;
    marca?: string;
    cor?: string;
    valorVenda?: number;
    quantidadeMinimaEstoque?: number;
    ativo?: boolean;
  }): Promise<Produto> {
    // Validar valor de venda se fornecido
    if (updateData.valorVenda !== undefined && updateData.valorVenda < 0) {
      throw new Error('Valor de venda não pode ser negativo');
    }

    // Validar quantidade mínima de estoque se fornecida
    if (updateData.quantidadeMinimaEstoque !== undefined) {
      if (updateData.quantidadeMinimaEstoque < 0 || updateData.quantidadeMinimaEstoque > 100) {
        throw new Error('Quantidade mínima de estoque deve estar entre 0 e 100');
      }
    }

    await this.produtoRepository.update(id, updateData);
    const produto = await this.findById(id);
    if (!produto) {
      throw new Error('Produto not found');
    }
    return produto;
  }

  async delete(id: string): Promise<void> {
    const result = await this.produtoRepository.delete(id);
    if (result.affected === 0) {
      throw new Error('Produto not found');
    }
  }

  async toggleAtivo(id: string): Promise<Produto> {
    const produto = await this.findById(id);
    if (!produto) {
      throw new Error('Produto not found');
    }
    
    produto.ativo = !produto.ativo;
    return this.produtoRepository.save(produto);
  }
}

