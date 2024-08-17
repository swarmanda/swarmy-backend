import { Module } from '@nestjs/common';
import { MonitorScheduledService } from './monitor.scheduled.service';
import { BeeModule } from '../bee/bee.module';
import { PlanModule } from '../plan/plan.module';
import { OrganizationModule } from '../organization/organization.module';

@Module({
  imports: [BeeModule, PlanModule, OrganizationModule],
  providers: [MonitorScheduledService],
})
export class MonitorModule {}
