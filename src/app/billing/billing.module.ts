import { Module } from '@nestjs/common';
import { PlanModule } from '../plan/plan.module';
import { PaymentModule } from '../payment/payment.module';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { BeeModule } from '../bee/bee.module';
import { OrganizationModule } from '../organization/organization.module';
import { DataModule } from '../data/data.module';
import { BillingScheduledService } from './billing.scheduled.service';

@Module({
  imports: [PlanModule, DataModule, PaymentModule, BeeModule, OrganizationModule],
  controllers: [BillingController],
  providers: [BillingService, BillingScheduledService],
  exports: [],
})
export class BillingModule {}
