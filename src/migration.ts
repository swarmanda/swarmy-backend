import { NestFactory } from '@nestjs/core';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';
import * as cookieParser from 'cookie-parser';
import { MigrationModule } from './app/migration/migration.module';

async function bootstrap() {
  const app = await NestFactory.create(MigrationModule, {
    rawBody: true,
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  app.useGlobalInterceptors(new LoggerErrorInterceptor());
  app.enableCors(); // todo
  app.use(cookieParser());
  await app.listen(4000);
}

bootstrap();
