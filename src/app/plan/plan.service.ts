import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Plan } from './plan.schema';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class PlanService {
  constructor(
    @InjectPinoLogger(PlanService.name)
    private readonly logger: PinoLogger,
    @InjectModel(Plan.name) private planModel: Model<Plan>,
  ) {
  }

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

    const plan = (await this.planModel.findOneAndUpdate({ _id: planId }, { status: 'ACTIVE' })) as Plan;
    this.logger.info('Plan activated ', plan._id);
    return plan;
  }

  async deactivatePlan(organizationId: string) {
    const existingActivePlan = await this.getActivePlanForOrganization(organizationId);
    const plan = (await this.planModel.findOneAndUpdate({ _id: existingActivePlan._id }, { status: 'CANCELLED' })) as Plan;
    // todo cancel stripe subscription
    // todo update quotas?
  }
}
