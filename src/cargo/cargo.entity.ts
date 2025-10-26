import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('cargos')
export class Cargo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  descricao: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
