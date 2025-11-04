import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../user/user.entity';
import { Funcionario } from '../funcionario/funcionario.entity';
import { VendaItem } from './venda-item.entity';
import { VendaPagamento } from './venda-pagamento.entity';

@Entity('vendas')
export class Venda {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nomeCliente: string;

  @Column({ nullable: true })
  rua?: string;

  @Column({ nullable: true })
  bairro?: string;

  @Column({ nullable: true })
  cidade?: string;

  @Column({ nullable: true })
  numero?: string;

  @Column({ type: 'timestamp' })
  dataVenda: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  valorTotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, nullable: true })
  desconto?: number;

  @Column({ type: 'text', nullable: true })
  observacao?: string;

  @ManyToOne(() => Funcionario)
  @JoinColumn({ name: 'vendedorId' })
  vendedor: Funcionario;

  @Column()
  vendedorId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'usuarioId' })
  usuario: User;

  @Column()
  usuarioId: string;

  @OneToMany(() => VendaItem, (item) => item.venda, { cascade: true, eager: true })
  itens: VendaItem[];

  @OneToMany(() => VendaPagamento, (p) => p.venda, { cascade: true, eager: true })
  pagamentos: VendaPagamento[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}


