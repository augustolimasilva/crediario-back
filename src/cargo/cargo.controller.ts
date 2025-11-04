import { Controller, Get, Post, Put, Delete, Body, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { CargoService } from './cargo.service';
import { Cargo } from './cargo.entity';

@Controller('cargo')
export class CargoController {
  constructor(private cargoService: CargoService) {}

  @Get()
  async getAllCargos(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.cargoService.findAll(Number(page) || 1, Number(pageSize) || 20);
  }

  @Get(':id')
  async getCargoById(@Param('id', ParseUUIDPipe) id: string) {
    return this.cargoService.findById(id);
  }

  @Post()
  async createCargo(@Body() cargoData: { descricao: string }) {
    return this.cargoService.create(cargoData);
  }

  @Put(':id')
  async updateCargo(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateData: { descricao?: string }
  ) {
    return this.cargoService.update(id, updateData);
  }

  @Delete(':id')
  async deleteCargo(@Param('id', ParseUUIDPipe) id: string) {
    return this.cargoService.delete(id);
  }
}
