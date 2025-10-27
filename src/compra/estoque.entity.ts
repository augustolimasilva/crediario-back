import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Produto } from '../produto/produto.entity';
import { User } from '../user/user.entity';
import { Compra } from './compra.entity';

export enum TipoMovimentacao {
  ENTRADA = 'ENTRADA',
  SAIDA = 'SAIDA',
  AJUSTE = 'AJUSTE',
}

@Entity('estoque')
@Index(['produtoId', 'dataMovimentacao'])
export class Estoque {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int', generated: 'increment', unique: true })
  numeroEstoque: number;

  @Column({ type: 'int', generated: 'increment', unique: true })
  numeroLote: number;

  @ManyToOne(() => Produto, { eager: true })
  @JoinColumn({ name: 'produtoId' })
  produto: Produto;

  @Column()
  produtoId: string;

  @Column({ type: 'int' })
  quantidade: number;

  @Column({
    type: 'enum',
    enum: TipoMovimentacao,
    default: TipoMovimentacao.ENTRADA,
  })
  tipoMovimentacao: TipoMovimentacao;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  valorUnitario: number;

  @Column({ type: 'timestamp' })
  dataMovimentacao: Date;

  @ManyToOne(() => Compra, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'compraId' })
  compra?: Compra;

  @Column({ nullable: true })
  compraId?: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'usuarioId' })
  usuario: User;

  @Column()
  usuarioId: string;

  @Column({ type: 'text', nullable: true })
  observacao?: string;

  @CreateDateColumn()
  createdAt: Date;
}

