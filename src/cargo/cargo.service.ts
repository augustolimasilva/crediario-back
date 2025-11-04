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

  async findAll(page: number = 1, pageSize: number = 20): Promise<{ data: Cargo[]; total: number; page: number; pageSize: number }> {
    const take = Math.max(1, Math.min(pageSize, 200));
    const skip = Math.max(0, (Math.max(1, page) - 1) * take);
    const [data, total] = await this.cargoRepository.findAndCount({
      order: { descricao: 'ASC' },
      skip,
      take,
    });
    return { data, total, page: Math.max(1, page), pageSize: take };
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
