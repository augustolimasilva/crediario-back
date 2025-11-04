import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Produto } from './produto.entity';
import { User } from '../user/user.entity';

export enum TipoAlteracao {
  CRIADO = 'CRIADO',
  ATUALIZADO = 'ATUALIZADO',
  EXCLUIDO = 'EXCLUIDO',
  ATIVADO = 'ATIVADO',
  DESATIVADO = 'DESATIVADO',
}

@Entity('produto_historico')
export class ProdutoHistorico {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Produto, { onDelete: 'CASCADE' })
  produto: Produto;

  @Column()
  produtoId: string;

  @ManyToOne(() => User)
  usuario: User;

  @Column()
  usuarioId: string;

  @Column({
    type: 'enum',
    enum: TipoAlteracao,
  })
  tipoAlteracao: TipoAlteracao;

  @Column('text', { nullable: true })
  descricao: string;

  @Column('jsonb', { nullable: true })
  dadosAnteriores: Record<string, any>;

  @Column('jsonb', { nullable: true })
  dadosNovos: Record<string, any>;

  @Column('text', { nullable: true })
  observacao: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  precoMedio: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  percentualComissao: number;

  @Column({ type: 'varchar', length: 30, nullable: true })
  classificacao: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
