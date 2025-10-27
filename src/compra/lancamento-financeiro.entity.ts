import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Compra } from './compra.entity';
import { User } from '../user/user.entity';

export enum TipoLancamento {
  DEBITO = 'DEBITO',
  CREDITO = 'CREDITO',
}

export enum FormaPagamento {
  PIX = 'PIX',
  CARTAO_CREDITO = 'CARTAO_CREDITO',
  ESPECIE = 'ESPECIE',
  BOLETO = 'BOLETO',
  CARTAO_DEBITO = 'CARTAO_DEBITO',
  TRANSFERENCIA = 'TRANSFERENCIA',
  CHEQUE = 'CHEQUE',
}

@Entity('lancamentos_financeiros')
@Index(['dataLancamento', 'tipoLancamento'])
export class LancamentoFinanceiro {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: TipoLancamento,
  })
  tipoLancamento: TipoLancamento;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  valor: number;

  @Column({ type: 'timestamp' })
  dataLancamento: Date;

  @Column({ type: 'date', nullable: true })
  dataVencimento?: Date;

  @Column({ type: 'date', nullable: true })
  dataPagamento?: Date;

  @Column({
    type: 'enum',
    enum: FormaPagamento,
    nullable: true,
  })
  formaPagamento?: FormaPagamento;

  @ManyToOne(() => Compra, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'compraId' })
  compra?: Compra;

  @Column({ nullable: true })
  compraId?: string;

  @Column({ nullable: true })
  vendaId?: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'funcionarioId' })
  funcionario?: User;

  @Column({ nullable: true })
  funcionarioId?: string;

  @Column({ type: 'text', nullable: true })
  observacao?: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'usuarioId' })
  usuario: User;

  @Column()
  usuarioId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
