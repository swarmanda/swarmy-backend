import { Module } from '@nestjs/common';
import { AlertModule } from '../alert/alert.module';
import { PlanController } from './plan.controller';
import { PlanService } from './plan.service';

@Module({
  controllers: [PlanController],
  providers: [PlanService],
  exports: [PlanService],
  imports: [AlertModule],
})
export class PlanModule {}
