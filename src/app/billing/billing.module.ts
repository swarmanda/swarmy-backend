import { Module } from '@nestjs/common';
import { AlertModule } from '../alert/alert.module';
import { BeeModule } from '../bee/bee.module';
import { DataModule } from '../data/data.module';
import { OrganizationModule } from '../organization/organization.module';
import { PaymentModule } from '../payment/payment.module';
import { PlanModule } from '../plan/plan.module';
import { BillingController } from './billing.controller';
import { BillingScheduledService } from './billing.scheduled.service';
import { BillingService } from './billing.service';

@Module({
  imports: [PlanModule, DataModule, PaymentModule, BeeModule, OrganizationModule, AlertModule],
  controllers: [BillingController],
  providers: [BillingService, BillingScheduledService],
  exports: [],
})
export class BillingModule {}
