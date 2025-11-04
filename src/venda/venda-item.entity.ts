import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { Venda } from './venda.entity';
import { Produto } from '../produto/produto.entity';

@Entity('venda_itens')
export class VendaItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Venda, (venda) => venda.itens, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendaId' })
  venda: Venda;

  @Column()
  vendaId: string;

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


