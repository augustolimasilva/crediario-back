import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Compra } from './compra.entity';

export enum FormaPagamento {
  PIX = 'PIX',
  CARTAO_CREDITO = 'CARTAO_CREDITO',
  ESPECIE = 'ESPECIE',
  BOLETO = 'BOLETO',
  CARTAO_DEBITO = 'CARTAO_DEBITO',
  TRANSFERENCIA = 'TRANSFERENCIA',
  CHEQUE = 'CHEQUE',
}

export enum StatusPagamento {
  PENDENTE = 'PENDENTE',
  PAGO = 'PAGO',
  VENCIDO = 'VENCIDO',
  CANCELADO = 'CANCELADO',
}

@Entity('compra_pagamentos')
export class CompraPagamento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Compra, (compra) => compra.pagamentos, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'compraId' })
  compra: Compra;

  @Column()
  compraId: string;

  @Column({
    type: 'enum',
    enum: FormaPagamento,
  })
  formaPagamento: FormaPagamento;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  valor: number;

  @Column({ type: 'date' })
  dataVencimento: Date;

  @Column({ type: 'date', nullable: true })
  dataPagamento?: Date;

  @Column({
    type: 'enum',
    enum: StatusPagamento,
    default: StatusPagamento.PENDENTE,
  })
  status: StatusPagamento;

  @Column({ type: 'text', nullable: true })
  observacao?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

