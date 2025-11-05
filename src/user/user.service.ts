import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findByUsuario(usuario: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { usuario } });
  }


  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ 
      where: { id },
      select: ['id', 'usuario', 'name', 'avatar', 'isActive', 'createdAt', 'updatedAt']
    });
  }

  async createUser(userData: {
    usuario: string;
    name: string;
    password?: string;
    avatar?: string;
  }): Promise<User> {
    const user = this.userRepository.create(userData);
    
    if (userData.password) {
      user.password = await bcrypt.hash(userData.password, 10);
    }
    
    return this.userRepository.save(user);
  }

  async updateUser(id: string, updateData: Partial<User>): Promise<User> {
    // Se houver senha, criptografar antes de salvar
    const dataToUpdate = { ...updateData };
    if (dataToUpdate.password) {
      dataToUpdate.password = await bcrypt.hash(dataToUpdate.password, 10);
    }
    
    await this.userRepository.update(id, dataToUpdate);
    
    const user = await this.findById(id);
    if (!user) {
      throw new Error('User not found');
    }
    
    return user;
  }

  async validatePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  async findAll(page: number = 1, pageSize: number = 20): Promise<{ data: Partial<User>[]; total: number; page: number; pageSize: number }> {
    const take = Math.max(1, Math.min(pageSize, 200));
    const skip = Math.max(0, (Math.max(1, page) - 1) * take);
    const [users, total] = await this.userRepository.findAndCount({
      select: ['id', 'name', 'usuario', 'isActive', 'createdAt', 'updatedAt'],
      order: { name: 'ASC' },
      skip,
      take,
    });
    return { data: users, total, page: Math.max(1, page), pageSize: take };
  }

  async deleteUser(id: string): Promise<void> {
    const result = await this.userRepository.delete(id);
    if (result.affected === 0) {
      throw new Error('User not found');
    }
  }
}
