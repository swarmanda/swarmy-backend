import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Interval } from '@nestjs/schedule';
import { PlanService } from '../plan/plan.service';
import { OrganizationService } from '../organization/organization.service';
import { Organization } from '../organization/organization.schema';
import { BeeService } from '../bee/bee.service';
import { PostageBatch } from '@ethersphere/bee-js';

// const FIVE_MINUTES_IN_MILLIS = 5 * 60 * 1000;
const FIVE_MINUTES_IN_MILLIS = 10 * 1000;

@Injectable()
export class MonitorScheduledService {
  constructor(
    @InjectPinoLogger(MonitorScheduledService.name)
    private readonly logger: PinoLogger,
    private readonly beeService: BeeService,
    private readonly planService: PlanService,
    private readonly organizationService: OrganizationService,
  ) {}

  @Interval(FIVE_MINUTES_IN_MILLIS)
  async checkPostageBatchTTL(org: Organization) {
    const plans = await this.planService.getPlans({ status: 'ACTIVE' });
    const batches = await this.beeService.getAllPostageBatches();
    if (plans.length !== batches.length) {
      this.logger.warn(
        `Number of active plans and number of batches do not match. Plans: ${plans.length}, batches: ${batches.length}`,
      );
    }
    for (const plan of plans) {
      const org = await this.organizationService.getOrganization(plan.organizationId);
      await this.checkTTL(org, batches);
    }
  }

  private async checkTTL(org: Organization, batches: PostageBatch[]) {
    const batch = batches.find((batch) => batch.batchID === org.postageBatchId);
    if (!batch) {
      this.logger.warn('There is no batch with id on the bee instance:' + org.postageBatchId);
      return;
    }

    const duration = this.toHumanReadableDuration(batch.batchTTL);
    this.logger.info(
      `BatchId ${batch.batchID} - TTL: ${batch.batchTTL} (${duration.value} ${duration.label}), 
      utilization: ${batch.utilization}, amount: ${batch.amount}`,
    );
  }

  private toHumanReadableDuration(seconds: number) {
    const days = Math.floor((seconds % 31536000) / 86400);
    const hours = Math.floor(((seconds % 31536000) % 86400) / 3600);
    const minutes = Math.floor((((seconds % 31536000) % 86400) % 3600) / 60);

    if (days > 0) {
      return {
        value: days.toFixed(1),
        label: 'days',
      };
    }
    if (hours > 0) {
      return {
        value: hours.toFixed(1),
        label: 'hours',
      };
    }
    return {
      value: minutes.toFixed(1),
      label: 'minutes',
    };
  }
}
