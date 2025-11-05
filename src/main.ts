import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { LoggingInterceptor } from './logging.interceptor';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: true,
    rawBody: false,
  });
  
  // Aumentar limite de tamanho do body para requisições grandes (imagens base64)
  const expressInstance = app.getHttpAdapter().getInstance();
  expressInstance.use(require('express').json({ limit: '10mb' }));
  expressInstance.use(require('express').urlencoded({ limit: '10mb', extended: true }));
  
  // Configurar pasta estática para uploads
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads',
  });
  
  // Enable CORS with multiple origins
  const allowedOrigins = [
    'http://localhost:3000',
    'https://www.nasuaporta.com.br',
  ];
  
  // Add FRONTEND_URL if provided
  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
  }
  
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });
  
  // Enable logging interceptor
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Enable validation pipes
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: false, // Não falhar se houver propriedades não whitelisted
  }));
  
  const port = process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0'); // Listen on all interfaces
}
bootstrap();
