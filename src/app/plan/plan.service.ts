import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Plan } from './plan.schema';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { addMonths } from 'date-fns';

@Injectable()
export class PlanService {
  constructor(
    @InjectPinoLogger(PlanService.name)
    private readonly logger: PinoLogger,
    @InjectModel(Plan.name) private planModel: Model<Plan>,
  ) {}

  async createPlan(plan: Partial<Plan>): Promise<Plan> {
    return (await new this.planModel({
      ...plan,
      status: 'PENDING_PAYMENT',
    }).save()) as Plan;
  }

  async getActivePlanForOrganization(organizationId: string): Promise<Plan> {
    return (await this.planModel.findOne({
      organizationId,
      status: 'ACTIVE',
    })) as Plan;
  }

  async activatePlan(organizationId: string, planId: string): Promise<Plan> {
    const existingActivePlan = await this.getActivePlanForOrganization(organizationId);
    if (existingActivePlan) {
      this.logger.error(`Can't activate plan, there is already an active plan for this organization ${organizationId}`);
      throw new BadRequestException('There is already an active plan for this organization', organizationId);
    }

    const now = new Date();
    const paidTill = addMonths(now, 1);
    const plan = await this.updatePlan(planId, { status: 'ACTIVE', paidTill });
    this.logger.info('Plan activated ', plan._id);
    return plan;
  }

  async cancelPlan(orgId: string, planId: string) {
    const plan = await this.getPlanById(orgId, planId);
    return await this.updatePlan(plan._id.toString(), { status: 'CANCELLED' });
  }

  async scheduleActivePlanForCancellation(organizationId: string) {
    const existingActivePlan = await this.getActivePlanForOrganization(organizationId);
    return await this.updatePlan(existingActivePlan._id.toString(), {
      status: 'SCHEDULED_FOR_CANCELLATION',
      cancelAt: existingActivePlan.paidTill,
    });
  }

  async updatePlan(_id: string, update: Partial<Plan>): Promise<Plan> {
    return (await this.planModel.findOneAndUpdate({ _id }, update)) as Plan;
  }

  async getPlanById(organizationId: string, planId: string) {
    return (await this.planModel.findOne({
      organizationId,
      _id: planId,
    })) as Plan;
  }

  async getPlans(filter: Record<string, any>): Promise<Plan[]> {
    return this.planModel.find(filter);
  }
}
