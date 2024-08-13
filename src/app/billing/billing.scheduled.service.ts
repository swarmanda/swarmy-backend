import { Injectable } from '@nestjs/common';
import { PlanService } from '../plan/plan.service';
import { OrganizationService } from '../organization/organization.service';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { UsageMetricsService } from '../data/usage-metrics.service';
import { Interval } from '@nestjs/schedule';
import { Plan } from '../plan/plan.schema';

@Injectable()
export class BillingScheduledService {
  constructor(
    @InjectPinoLogger(BillingScheduledService.name)
    private readonly logger: PinoLogger,
    private planService: PlanService,
    private organizationService: OrganizationService,
    private usageMetricsService: UsageMetricsService,
  ) {}

  //every 5th minute
  @Interval(1000)
  async checkPlansForCancellation() {
    const plans = await this.planService.getPlans({
      status: 'SCHEDULED_FOR_CANCELLATION',
      cancelAt: {
        $lt: new Date(),
      },
    });
    this.logger.info(`Cancelling ${plans.length} plans`);
    for (const plan of plans) {
      await this.cancelPlan(plan);
    }
  }

  async cancelPlan(plan: Plan) {
    const org = await this.organizationService.getOrganization(plan.organizationId.toString());
    this.logger.info(`Cancelling plan ${plan._id} for organization ${org._id}`);
    await this.planService.cancelPlan(org._id.toString(), plan._id.toString());
    this.logger.info(`Removing postageBatchId ${org.postageBatchId} from organization ${org._id}`);
    await this.organizationService.update(org._id.toString(), { postageBatchId: null, postageBatchStatus: 'REMOVED' });
    this.logger.info(`Resetting usage metrics for organization ${org._id}`);
    await this.usageMetricsService.resetCurrentMetrics(org._id.toString());
  }
}
