import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PlanTemplate, PlanTemplateSchema } from './plan-template.schema';
import { PlanController } from './plan.controller';
import { PlanService } from './plan.service';
import { Plan, PlanSchema } from './plan.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PlanTemplate.name, schema: PlanTemplateSchema },
      { name: Plan.name, schema: PlanSchema },
    ]),
  ],
  controllers: [PlanController],
  providers: [PlanService],
  exports: [PlanService],
})
export class PlanModule {}
