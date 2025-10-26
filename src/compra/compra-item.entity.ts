import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Compra } from './compra.entity';
import { Produto } from '../produto/produto.entity';

@Entity('compra_itens')
export class CompraItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Compra, (compra) => compra.itens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'compraId' })
  compra: Compra;

  @Column()
  compraId: string;

  @ManyToOne(() => Produto)
  @JoinColumn({ name: 'produtoId' })
  produto: Produto;

  @Column()
  produtoId: string;

  @Column({ type: 'int' })
  quantidade: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  valorUnitario: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  valorTotal: number;

  @CreateDateColumn()
  createdAt: Date;
}

