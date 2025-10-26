import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Funcionario } from './funcionario.entity';

export enum TipoAlteracao {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

@Entity('funcionario_historico')
export class FuncionarioHistorico {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  funcionarioId: string;

  @ManyToOne(() => Funcionario)
  @JoinColumn({ name: 'funcionarioId' })
  funcionario: Funcionario;

  @Column({
    type: 'enum',
    enum: TipoAlteracao,
  })
  tipoAlteracao: TipoAlteracao;

  @Column({ type: 'jsonb', nullable: true })
  dadosAnteriores: any;

  @Column({ type: 'jsonb', nullable: true })
  dadosNovos: any;

  @Column({ nullable: true })
  usuarioAlteracao?: string;

  @Column({ nullable: true })
  ipAlteracao?: string;

  @Column({ nullable: true })
  userAgent?: string;

  @CreateDateColumn()
  dataAlteracao: Date;

  @Column({ nullable: true })
  observacoes?: string;
}
