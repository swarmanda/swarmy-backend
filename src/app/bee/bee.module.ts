import { Module } from '@nestjs/common';
import { BeeService } from './bee.service';

@Module({
  controllers: [],
  providers: [BeeService],
  exports: [BeeService],
})
export class BeeModule {}
