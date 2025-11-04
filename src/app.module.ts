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
import { LancamentoFinanceiroModule } from './lancamento-financeiro/lancamento-financeiro.module';
import { User } from './user/user.entity';
import { Cargo } from './cargo/cargo.entity';
import { Funcionario } from './funcionario/funcionario.entity';
import { FuncionarioHistorico } from './funcionario/funcionario-historico.entity';
import { Produto } from './produto/produto.entity';
import { ProdutoHistorico } from './produto/produto-historico.entity';
import { Compra } from './compra/compra.entity';
import { CompraItem } from './compra/compra-item.entity';
import { CompraPagamento } from './compra/compra-pagamento.entity';
import { Estoque } from './compra/estoque.entity';
import { LancamentoFinanceiro } from './compra/lancamento-financeiro.entity';
import { Venda } from './venda/venda.entity';
import { VendaItem } from './venda/venda-item.entity';
import { VendaPagamento } from './venda/venda-pagamento.entity';
import { VendaModule } from './venda/venda.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: 'config.env',
      ignoreEnvFile: process.env.NODE_ENV === 'production',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'crediario_user',
      password: process.env.DB_PASSWORD || 'crediario_password',
      database: process.env.DB_DATABASE || 'crediario_db',
      entities: [User, Cargo, Funcionario, FuncionarioHistorico, Produto, ProdutoHistorico, Compra, CompraItem, CompraPagamento, Estoque, LancamentoFinanceiro, Venda, VendaItem, VendaPagamento],
      synchronize: process.env.NODE_ENV === 'development',
      logging: process.env.NODE_ENV === 'development',
    }),
    UserModule,
    AuthModule,
    CargoModule,
    FuncionarioModule,
    ProdutoModule,
    CompraModule,
    LancamentoFinanceiroModule,
    VendaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
