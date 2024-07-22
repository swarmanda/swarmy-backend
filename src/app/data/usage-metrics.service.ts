import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from '../user/user.schema';
import { Model } from 'mongoose';
import { UsageMetrics, UsageMetricType } from './usage-metrics.schema';
import { Organization } from '../organization/organization.schema';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PlanService } from '../plan/plan.service';

@Injectable()
export class UsageMetricsService {
  constructor(
    @InjectPinoLogger(UsageMetricsService.name)
    private readonly logger: PinoLogger,
    @InjectModel(UsageMetrics.name)
    private usageMetricsModel: Model<UsageMetrics>,
    private planService: PlanService,
  ) {
  }

  async create(user: User): Promise<UsageMetrics> {
    return await new this.usageMetricsModel({
      organizationId: user.organizationId,
    }).save();
  }

  async increment(
    organization: Organization,
    type: UsageMetricType,
    value: number,
    period: string = this.getCurrentPeriod(),
  ) {
    this.logger.info(`updating usage metrics org: ${organization._id}, period: ${period}, type: ${type}`);
    const updatedMetrics = (await this.usageMetricsModel.findOneAndUpdate(
      {
        organizationId: organization._id,
        period,
        type,
      },
      { $inc: { used: value } },
    )) as UsageMetrics;

    if (!updatedMetrics) {
      const plan = await this.planService.getActivePlanForOrganization(organization._id.toString());
      let available = 0;
      if (type === 'UPLOADED_BYTES') {
        available = plan.quotas.uploadSizeLimit;
      } else if (type === 'DOWNLOADED_BYTES') {
        available = plan.quotas.downloadSizeLimit;
      }
      this.logger.info(`Couldn't find metrics to update, creating a new one.`);
      return await new this.usageMetricsModel({
        organizationId: organization._id,
        period,
        type,
        available,
        used: value,
      }).save();
    }
  }

  async getForOrganization(organizationId: string) {
    //todo get active plan
    return (await this.usageMetricsModel.findOne({
      organizationId,
    })) as UsageMetrics;
  }

  getCurrentPeriod() {
    const now = new Date();
    const month = `${now.getUTCMonth() + 1}`.padStart(2, '0');
    return `${now.getUTCFullYear()}-${month}`;
  }
}
