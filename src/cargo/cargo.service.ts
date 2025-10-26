import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cargo } from './cargo.entity';

@Injectable()
export class CargoService {
  constructor(
    @InjectRepository(Cargo)
    private cargoRepository: Repository<Cargo>,
  ) {}

  async findAll(): Promise<Cargo[]> {
    return this.cargoRepository.find({
      order: { descricao: 'ASC' }
    });
  }

  async findById(id: string): Promise<Cargo | null> {
    return this.cargoRepository.findOne({ where: { id } });
  }

  async create(cargoData: { descricao: string }): Promise<Cargo> {
    const cargo = this.cargoRepository.create(cargoData);
    return this.cargoRepository.save(cargo);
  }

  async update(id: string, updateData: { descricao?: string }): Promise<Cargo> {
    await this.cargoRepository.update(id, updateData);
    const cargo = await this.findById(id);
    if (!cargo) {
      throw new Error('Cargo not found');
    }
    return cargo;
  }

  async delete(id: string): Promise<void> {
    const result = await this.cargoRepository.delete(id);
    if (result.affected === 0) {
      throw new Error('Cargo not found');
    }
  }
}
