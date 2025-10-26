import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { User } from '../user/user.entity';
import { CompraItem } from './compra-item.entity';
import { CompraPagamento } from './compra-pagamento.entity';

@Entity('compras')
export class Compra {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nomeFornecedor: string;

  @Column({ type: 'timestamp' })
  dataCompra: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  valorTotal: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'usuarioId' })
  usuario: User;

  @Column()
  usuarioId: string;

  @OneToMany(() => CompraItem, (item) => item.compra, { cascade: true, eager: true })
  itens: CompraItem[];

  @OneToMany(() => CompraPagamento, (pagamento) => pagamento.compra, { cascade: true, eager: true })
  pagamentos: CompraPagamento[];

  @Column({ type: 'text', nullable: true })
  observacao?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

