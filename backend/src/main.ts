import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import 'reflect-metadata';
import { AppModule } from './app.module';
import { GlobalHttpExceptionFilter } from './common/filters/http-exception.filter';
import { TypeOrmExceptionFilter } from './common/filters/typeorm-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Enable global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global filters
  app.useGlobalFilters(new GlobalHttpExceptionFilter(), new TypeOrmExceptionFilter());

  // Enable URI versioning: /api/v1/...
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  });

  // Set global API prefix
  app.setGlobalPrefix('api');

  // Enable CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Configure Swagger
  const appConfig = configService.get('app');
  const config = new DocumentBuilder()
    .setTitle(appConfig.swagger.title)
    .setDescription(appConfig.swagger.description)
    .setVersion(appConfig.swagger.version)
    .addBearerAuth()
    .addTag('Health', 'Application health checks')
    .addTag('Receipts', 'OCR receipt scanning and parsing')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(appConfig.swagger.path, app, document);

  const port = appConfig.port;
  await app.listen(port);
  console.log(`✅ NestJS application running on http://localhost:${port}`);
  console.log(`📚 Swagger documentation available at http://localhost:${port}${appConfig.swagger.path}`);
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start application:', error);
  process.exit(1);
});
