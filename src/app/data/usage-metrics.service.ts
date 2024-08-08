import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model } from 'mongoose';
import { UsageMetrics, UsageMetricType } from './usage-metrics.schema';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PlanService } from '../plan/plan.service';
import { PlanQuota } from '../plan/plan-quota.schema';

const LIFETIME_PERIOD = 'LIFETIME';

@Injectable()
export class UsageMetricsService {
  constructor(
    @InjectPinoLogger(UsageMetricsService.name)
    private readonly logger: PinoLogger,
    @InjectModel(UsageMetrics.name)
    private usageMetricsModel: Model<UsageMetrics>,
    private planService: PlanService,
  ) {}

  async increment(
    organizationId: string,
    type: UsageMetricType,
    value: number,
    period: string = this.getCurrentPeriod(),
  ) {
    this.logger.info(`updating usage metrics org: ${organizationId}, period: ${period}, type: ${type}`);

    const updatedMetrics = await this.updateMetrics(organizationId, period, type, {
      $inc: { used: value },
    });
    if (!updatedMetrics) {
      return await this.initializeMetrics(organizationId, type, period, value);
    }
  }

  private async initializeMetrics(
    organizationId: string,
    type: 'UPLOADED_BYTES' | 'DOWNLOADED_BYTES',
    period: string,
    value: number,
  ) {
    const plan = await this.planService.getActivePlanForOrganization(organizationId);
    let available = 0;
    if (type === 'UPLOADED_BYTES') {
      available = plan.quotas.uploadSizeLimit;
    } else if (type === 'DOWNLOADED_BYTES') {
      available = plan.quotas.downloadSizeLimit;
    }
    this.logger.info(
      `Couldn't find metric ${type} to upgrade for org: ${organizationId}, creating a new one for period: ${period}`,
    );
    return await new this.usageMetricsModel({
      organizationId,
      period,
      type,
      available,
      used: value,
    }).save();
  }

  async updateMetrics(organizationId: string, period: string, type: UsageMetricType, update: any) {
    return (await this.usageMetricsModel.findOneAndUpdate(
      {
        organizationId,
        period,
        type,
      },
      update,
    )) as UsageMetrics;
  }

  async getForOrganization(organizationId: string, type?: UsageMetricType): Promise<UsageMetrics> {
    //todo get active plan
    const filter: FilterQuery<UsageMetrics> = {
      organizationId,
      period: { $in: [this.getCurrentPeriod(), LIFETIME_PERIOD] },
    };
    if (type) {
      filter.type = type;
    }
    return (await this.usageMetricsModel.findOne(filter)) as UsageMetrics;
  }

  async getAllForOrganization(organizationId: string): Promise<UsageMetrics[]> {
    //todo get active plan
    return (await this.usageMetricsModel.find({
      organizationId,
      period: { $in: [this.getCurrentPeriod(), LIFETIME_PERIOD] },
    })) as UsageMetrics[];
  }

  async upgrade(organizationId: string, quotas: PlanQuota) {
    await this.upsert(organizationId, 'UPLOADED_BYTES', LIFETIME_PERIOD, quotas.uploadSizeLimit);
    await this.upsert(organizationId, 'DOWNLOADED_BYTES', this.getCurrentPeriod(), quotas.downloadSizeLimit);
  }

  private async upsert(
    organizationId: string,
    type: UsageMetricType,
    period: string,
    available: number,
    used?: number,
  ) {
    this.logger.info(
      `Upgrading metric org: ${organizationId}, type: ${type}, period: ${period}, to available: ${available}, used: ${used === undefined ? 'UNCHANGED' : used}`,
    );
    const update = used === undefined ? { available } : { available, used };
    const metrics = await this.updateMetrics(organizationId, period, type, update);
    if (!metrics) {
      this.logger.info(
        `Couldn't find metric ${type} to upgrade for org: ${organizationId}, creating a new one for period: ${period}`,
      );
      return await new this.usageMetricsModel({
        organizationId,
        available,
        period,
        type: type,
        used: 0,
      }).save();
    }
  }

  getCurrentPeriod() {
    const now = new Date();
    const month = `${now.getUTCMonth() + 1}`.padStart(2, '0');
    return `${now.getUTCFullYear()}-${month}`;
  }

  async resetCurrentMetrics(organizationId: string) {
    await this.upsert(organizationId, 'UPLOADED_BYTES', LIFETIME_PERIOD, 0, 0);
    await this.upsert(organizationId, 'DOWNLOADED_BYTES', this.getCurrentPeriod(), 0, 0);
  }
}
