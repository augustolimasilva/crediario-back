import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Venda } from './venda.entity';
import { FormaPagamento, StatusPagamento } from '../compra/compra-pagamento.entity';

@Entity('venda_pagamentos')
export class VendaPagamento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Venda, (v) => v.pagamentos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'vendaId' })
  venda: Venda;

  @Column()
  vendaId: string;

  @Column({ type: 'enum', enum: FormaPagamento })
  formaPagamento: FormaPagamento;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  valor: number;

  @Column({ type: 'date' })
  dataVencimento: Date;

  @Column({ type: 'date', nullable: true })
  dataPagamento?: Date;

  @Column({ type: 'enum', enum: StatusPagamento, default: StatusPagamento.PENDENTE })
  status: StatusPagamento;

  @Column({ type: 'text', nullable: true })
  observacao?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}


