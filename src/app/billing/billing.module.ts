import { Module } from '@nestjs/common';
import { PlanModule } from '../plan/plan.module';
import { PaymentModule } from '../payment/payment.module';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { BeeModule } from '../bee/bee.module';
import { OrganizationModule } from '../organization/organization.module';

@Module({
  imports: [PlanModule, PaymentModule, BeeModule, OrganizationModule],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [],
})
export class BillingModule {}
