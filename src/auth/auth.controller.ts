import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Res,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  @Post('register')
  async register(@Body() registerDto: { usuario: string; name: string; password: string }) {
    try {
      return await this.authService.register(registerDto);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }


  @Post('validate')
  async validateToken(@Body() body: { token: string }) {
    try {
      const user = await this.authService.validateUser(body.token, '');
      return { valid: true, user };
    } catch (error) {
      return { valid: false };
    }
  }
}
