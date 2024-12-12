import { BadRequestException, Injectable } from '@nestjs/common';
import { Dates } from 'cafe-utility';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  getOnlyPlansRowOrNull,
  getOnlyPlansRowOrThrow,
  OrganizationsRowId,
  PlansRow,
  PlansRowId,
  updatePlansRow,
} from 'src/DatabaseExtra';
import { AlertService } from '../alert/alert.service';

@Injectable()
export class PlanService {
  constructor(
    @InjectPinoLogger(PlanService.name)
    private readonly logger: PinoLogger,
    private alertService: AlertService,
  ) {}

  async getActivePlanForOrganization(organizationId: OrganizationsRowId): Promise<PlansRow | null> {
    return getOnlyPlansRowOrNull({ organizationId, status: 'ACTIVE' });
  }

  async activatePlan(organizationId: OrganizationsRowId, planId: PlansRowId): Promise<PlansRow> {
    const existingActivePlan = await this.getActivePlanForOrganization(organizationId);
    if (existingActivePlan) {
      const message = `Can't activate plan, there is already an active plan for this organization ${organizationId}`;
      this.logger.error(message);
      this.alertService.sendAlert(message);
      throw new BadRequestException(message);
    }

    const paidUntil = new Date(Date.now() + Dates.days(31));
    await updatePlansRow(planId, { status: 'ACTIVE', paidUntil });
    this.logger.info('Plan activated ', planId);
    return getOnlyPlansRowOrThrow({ id: planId });
  }

  async cancelPlan(organizationId: OrganizationsRowId, planId: PlansRowId) {
    const plan = await this.getPlanById(organizationId, planId);
    await updatePlansRow(plan.id, { status: 'CANCELLED' });
  }

  async scheduleActivePlanForCancellation(organizationId: OrganizationsRowId) {
    const existingActivePlan = await this.getActivePlanForOrganization(organizationId);
    if (!existingActivePlan) {
      return;
    }
    await updatePlansRow(existingActivePlan.id, { cancelAt: existingActivePlan.paidUntil });
  }

  async getPlanById(organizationId: OrganizationsRowId, planId: PlansRowId) {
    return getOnlyPlansRowOrThrow({ organizationId, id: planId });
  }
}
