import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import { User } from '../user/user.entity';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
  ) {}

  async validateUser(usuario: string, password: string): Promise<any> {
    const user = await this.userService.findByUsuario(usuario);
    if (user && user.password && await this.userService.validatePassword(password, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }


  async login(user: any) {
    const payload = { usuario: user.usuario, sub: user.id };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        usuario: user.usuario,
        name: user.name,
        avatar: user.avatar,
      },
    };
  }

  async register(userData: { usuario: string; name: string; password: string }) {
    const existingUser = await this.userService.findByUsuario(userData.usuario);
    
    if (existingUser) {
      throw new Error('User already exists');
    }

    const user = await this.userService.createUser(userData);
    return this.login(user);
  }
}
