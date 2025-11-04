import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ClassificacaoProduto {
  PRODUTO_ESTOQUE = 'PRODUTO_ESTOQUE',
  ATIVO_IMOBILIZADO = 'ATIVO_IMOBILIZADO',
  SERVICO = 'SERVICO',
  MATERIAL_CONSUMO = 'MATERIAL_CONSUMO',
}

@Entity('produtos')
export class Produto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nome: string;

  @Column({ type: 'text', nullable: true })
  descricao?: string;

  @Column({ nullable: true })
  marca?: string;

  @Column({ nullable: true })
  cor?: string;


  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  valor: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  precoMedio: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  percentualComissao: number;

  @Column({
    type: 'enum',
    enum: ClassificacaoProduto,
    default: ClassificacaoProduto.PRODUTO_ESTOQUE,
  })
  classificacao: ClassificacaoProduto;

  @Column({ default: false })
  temEstoque: boolean;

  @Column({ type: 'int', default: 0 })
  quantidadeMinimaEstoque: number;

  @Column({ default: true })
  ativo: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

