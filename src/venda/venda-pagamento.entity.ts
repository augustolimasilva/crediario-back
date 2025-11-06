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

  @Column({ 
    type: 'date',
    transformer: {
      to: (value: Date | string) => {
        if (!value) return value;
        if (typeof value === 'string') {
          return value;
        }
        // Converter Date para string YYYY-MM-DD no timezone local
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, '0');
        const day = String(value.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      },
      from: (value: string | Date) => {
        if (!value) return value;
        if (value instanceof Date) return value;
        // Converter string YYYY-MM-DD para Date no timezone local
        const [year, month, day] = value.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        date.setHours(0, 0, 0, 0);
        return date;
      }
    }
  })
  dataVencimento: Date;

  @Column({ 
    type: 'date', 
    nullable: true,
    transformer: {
      to: (value: Date | string | null | undefined) => {
        if (!value) return value;
        if (typeof value === 'string') {
          return value;
        }
        // Converter Date para string YYYY-MM-DD no timezone local
        const year = value.getFullYear();
        const month = String(value.getMonth() + 1).padStart(2, '0');
        const day = String(value.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      },
      from: (value: string | Date | null | undefined) => {
        if (!value) return value;
        if (value instanceof Date) return value;
        // Converter string YYYY-MM-DD para Date no timezone local
        const [year, month, day] = value.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        date.setHours(0, 0, 0, 0);
        return date;
      }
    }
  })
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


