import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Cargo } from '../cargo/cargo.entity';

@Entity('funcionarios')
export class Funcionario {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nome: string;

  @Column({ nullable: true })
  telefone?: string;

  @Column({ nullable: true })
  cep?: string;

  @Column({ nullable: true })
  endereco?: string;

  @Column({ nullable: true })
  numero?: string;

  @Column({ nullable: true })
  bairro?: string;

  @Column({ nullable: true })
  cidade?: string;

  @Column({ nullable: true })
  estado?: string;

  @Column({ nullable: true })
  pais?: string;

  @Column({ nullable: true, unique: true })
  cpf?: string;

  @Column({ nullable: true, unique: true })
  email?: string;

  @Column({ type: 'uuid' })
  cargoId: string;

  @ManyToOne(() => Cargo)
  @JoinColumn({ name: 'cargoId' })
  cargo: Cargo;

  // Campo temporário para compatibilidade com dados existentes
  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0, nullable: true })
  comissao?: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  salario?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
