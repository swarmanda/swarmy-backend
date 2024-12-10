import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  getOnlyUsageMetricsRowOrNull,
  getOnlyUsageMetricsRowOrThrow,
  getUsageMetricsRows,
  insertUsageMetricsRow,
  OrganizationsRowId,
  updateUsageMetricsRow,
  UsageMetricsRow,
} from 'src/DatabaseExtra';
import { PlanService } from '../plan/plan.service';
import { UsageMetricType } from './usage-metric-type';

const LIFETIME_PERIOD = 'LIFETIME';

@Injectable()
export class UsageMetricsService {
  constructor(
    @InjectPinoLogger(UsageMetricsService.name)
    private readonly logger: PinoLogger,
    private planService: PlanService,
  ) {}

  async increment(metric: UsageMetricsRow, value: number) {
    this.logger.debug(
      `Incrementing usage metrics id: ${metric.id} org: ${metric.organizationId}, period: ${metric.period}, type: ${metric.type} to used ${metric.used + value}`,
    );
    await updateUsageMetricsRow(metric.id, { used: metric.used + value });
  }

  private async initializeMetrics(
    organizationId: OrganizationsRowId,
    type: 'UPLOADED_BYTES' | 'DOWNLOADED_BYTES',
    period: string,
    value: number,
  ) {
    const plan = await this.planService.getActivePlanForOrganization(organizationId);
    let available = 0;
    if (plan) {
      if (type === 'UPLOADED_BYTES') {
        available = plan.uploadSizeLimit;
      } else if (type === 'DOWNLOADED_BYTES') {
        available = plan.downloadSizeLimit;
      }
    }
    this.logger.info(
      `Couldn't find metric ${type} to upgrade for org: ${organizationId}, creating a new one for period: ${period}`,
    );
    const id = await insertUsageMetricsRow({
      organizationId,
      period,
      type,
      available,
      used: value,
    });
    return getOnlyUsageMetricsRowOrThrow({ id });
  }

  async updateMetrics(
    organizationId: OrganizationsRowId,
    period: string,
    type: UsageMetricType,
    update: {
      available: number;
      used?: number;
    },
  ): Promise<UsageMetricsRow | null> {
    const metrics = await getOnlyUsageMetricsRowOrThrow({ organizationId, period, type });
    await updateUsageMetricsRow(metrics.id, update);
    return getOnlyUsageMetricsRowOrNull({ organizationId, period, type });
  }

  async getForOrganization(organizationId: OrganizationsRowId, type: UsageMetricType): Promise<UsageMetricsRow> {
    const metrics = await getUsageMetricsRows({ organizationId, type });
    let metric = metrics.find((x) => x.period === this.getCurrentPeriod() || x.period === LIFETIME_PERIOD);
    if (!metric) {
      const period = type === 'UPLOADED_BYTES' ? LIFETIME_PERIOD : this.getCurrentPeriod();
      metric = await this.initializeMetrics(organizationId, type, period, 0);
    }
    return metric;
  }

  async getAllForOrganization(organizationId: OrganizationsRowId): Promise<UsageMetricsRow[]> {
    const metrics = await getUsageMetricsRows({ organizationId });
    return metrics.filter((x) => {
      return x.period === this.getCurrentPeriod() || x.period === LIFETIME_PERIOD;
    });
  }

  async upgradeCurrentMetrics(organizationId: OrganizationsRowId, uploadSizeLimit: number, downloadSizeLimit: number) {
    await this.upsert(organizationId, 'UPLOADED_BYTES', LIFETIME_PERIOD, uploadSizeLimit);
    await this.upsert(organizationId, 'DOWNLOADED_BYTES', this.getCurrentPeriod(), downloadSizeLimit);
  }

  async resetCurrentMetrics(organizationId: OrganizationsRowId) {
    await this.upsert(organizationId, 'UPLOADED_BYTES', LIFETIME_PERIOD, 0, 0);
    await this.upsert(organizationId, 'DOWNLOADED_BYTES', this.getCurrentPeriod(), 0, 0);
  }

  private async upsert(
    organizationId: OrganizationsRowId,
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
      const id = await insertUsageMetricsRow({
        organizationId,
        available,
        period,
        type,
      });
      return getOnlyUsageMetricsRowOrThrow({ id });
    }
  }

  getCurrentPeriod() {
    const now = new Date();
    const month = `${now.getUTCMonth() + 1}`.padStart(2, '0');
    return `${now.getUTCFullYear()}-${month}`;
  }
}
