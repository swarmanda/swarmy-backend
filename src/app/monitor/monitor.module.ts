import { Module } from '@nestjs/common';
import { BeeModule } from '../bee/bee.module';
import { PlanModule } from '../plan/plan.module';
import { OrganizationModule } from '../organization/organization.module';
import { ExpirationMonitorScheduledService } from './expiration-monitor.scheduled.service';
import { WalletMonitorScheduledService } from './wallet-monitor.scheduled.service';

@Module({
  imports: [BeeModule, PlanModule, OrganizationModule],
  providers: [ExpirationMonitorScheduledService, WalletMonitorScheduledService],
})
export class MonitorModule {}
