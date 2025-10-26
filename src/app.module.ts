import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { CargoModule } from './cargo/cargo.module';
import { FuncionarioModule } from './funcionario/funcionario.module';
import { ProdutoModule } from './produto/produto.module';
import { CompraModule } from './compra/compra.module';
import { User } from './user/user.entity';
import { Cargo } from './cargo/cargo.entity';
import { Funcionario } from './funcionario/funcionario.entity';
import { FuncionarioHistorico } from './funcionario/funcionario-historico.entity';
import { Produto } from './produto/produto.entity';
import { Compra } from './compra/compra.entity';
import { CompraItem } from './compra/compra-item.entity';
import { CompraPagamento } from './compra/compra-pagamento.entity';
import { Estoque } from './compra/estoque.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'config.env',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'crediario_user',
      password: process.env.DB_PASSWORD || 'crediario_password',
      database: process.env.DB_DATABASE || 'crediario_db',
      entities: [User, Cargo, Funcionario, FuncionarioHistorico, Produto, Compra, CompraItem, CompraPagamento, Estoque],
      synchronize: process.env.NODE_ENV === 'development',
      logging: process.env.NODE_ENV === 'development',
    }),
    UserModule,
    AuthModule,
    CargoModule,
    FuncionarioModule,
    ProdutoModule,
    CompraModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
