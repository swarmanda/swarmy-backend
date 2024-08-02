import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';
import { Logger, LoggerErrorInterceptor } from 'nestjs-pino';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  app.useGlobalInterceptors(new LoggerErrorInterceptor());
  // app.enableCors(); // todo
  await app.listen(4000);
}

bootstrap();
