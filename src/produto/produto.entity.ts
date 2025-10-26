import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('produtos')
export class Produto {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nome: string;

  @Column({ type: 'text', nullable: true })
  descricao?: string;

  @Column({ nullable: true })
  marca?: string;

  @Column({ nullable: true })
  cor?: string;


  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  valorVenda: number;

  @Column({ type: 'int', default: 0 })
  quantidadeMinimaEstoque: number;

  @Column({ default: true })
  ativo: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

