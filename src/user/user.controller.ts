import { Controller, Get, Post, Put, Delete, UseGuards, Request, Body, Param, ParseUUIDPipe, Query, BadRequestException } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from './user.entity';

@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    return this.userService.findById(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  async updateProfile(
    @Request() req,
    @Body() body: { name?: string; password?: string; avatar?: string },
  ) {
    const updateData: any = {};
    
    // Adicionar campos do body
    if (body.name) {
      updateData.name = body.name;
    }
    if (body.password) {
      updateData.password = body.password;
    }
    
    // Avatar já vem como base64 do frontend (data URI)
    if (body.avatar) {
      // Validar que é um data URI válido
      if (!body.avatar.startsWith('data:image/')) {
        throw new BadRequestException('Formato de imagem inválido. Deve ser um data URI base64.');
      }
      updateData.avatar = body.avatar;
    }
    
    const updatedUser = await this.userService.updateUser(req.user.id, updateData);
    
    return updatedUser;
  }

  @Get()
  async getAllUsers(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.userService.findAll(Number(page) || 1, Number(pageSize) || 20);
  }

  @Get(':id')
  async getUserById(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.findById(id);
  }

  @Post()
  async createUser(@Body() userData: { name: string; usuario: string; password: string }) {
    return this.userService.createUser(userData);
  }

  @Put(':id')
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateData: { name?: string; usuario?: string; password?: string; isActive?: boolean }
  ) {
    return this.userService.updateUser(id, updateData);
  }

  @Delete(':id')
  async deleteUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.userService.deleteUser(id);
  }
}
