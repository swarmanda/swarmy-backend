import { Module } from '@nestjs/common';
import { HealthcheckController } from './healthcheck.controller';

@Module({
  imports: [],
  controllers: [HealthcheckController],
  providers: [],
  exports: [],
})
export class HealthcheckModule {}
