import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PlanTemplate } from './plan-template.schema';
import { Plan } from './plan.schema';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class PlanService {
  constructor(
    @InjectPinoLogger(PlanService.name)
    private readonly logger: PinoLogger,
    @InjectModel(PlanTemplate.name)
    private planTemplateModel: Model<PlanTemplate>,
    @InjectModel(Plan.name) private planModel: Model<Plan>,
  ) {
    this.initTemplates();
  }

  async initTemplates() {
    const result = await this.planTemplateModel.find();
    if (result.length > 0) {
      return;
    }
    await this.planTemplateModel.create({
      name: 'Starter Plan',
      amount: 100,
      currency: 'EUR',
      frequency: 'MONTH',
      order: 1,
      quotas: {
        uploadSizeLimit: 50 * 1024 * 1024, //50mb
        uploadCountLimit: 10000,
        downloadSizeLimit: 50 * 1024 * 1024, //50mb
        downloadCountLimit: 100000,
      },
      enabled: true,
    });
    await this.planTemplateModel.create({
      name: 'Enterprise Plan',
      amount: 200,
      currency: 'EUR',
      frequency: 'MONTH',
      order: 2,
      quotas: {
        uploadSizeLimit: 1024 * 1024 * 1024, //1gb
        uploadCountLimit: 10000,
        downloadSizeLimit: 1024 * 1024 * 1024, //1gb
        downloadCountLimit: 100000,
      },
      enabled: true,
    });
  }

  async getEnabledPlanTemplates(): Promise<PlanTemplate[]> {
    return (await this.planTemplateModel.find({
      enabled: true,
    })) as PlanTemplate[];
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

  async getPlanForOrganization(organizationId: string, planId: string): Promise<Plan> {
    return (await this.planModel.findOne({
      organizationId,
      _id: planId,
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

  // async getActivePlanByStripeCustomerId(stripeCustomerId: string) {
  //   return (await this.planModel.findOne({
  //     stripeCustomerId,
  //     status: 'ACTIVE'
  //   })) as Plan;
  // }
  async deactivatePlan(organizationId: string) {
    const existingActivePlan = await this.getActivePlanForOrganization(organizationId);
    const plan = (await this.planModel.findOneAndUpdate({ _id: existingActivePlan._id }, { status: 'CANCELLED' })) as Plan;
    // todo cancel stripe subscription
    // todo update quotas?
  }
}
