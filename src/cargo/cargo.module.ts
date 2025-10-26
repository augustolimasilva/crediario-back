import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cargo } from './cargo.entity';
import { CargoService } from './cargo.service';
import { CargoController } from './cargo.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Cargo])],
  providers: [CargoService],
  controllers: [CargoController],
  exports: [CargoService],
})
export class CargoModule {}
