import { BadRequestException, Injectable } from '@nestjs/common';
import { PlanService } from '../plan/plan.service';
import { StripeService } from '../payment/stripe.service';
import { User } from '../user/user.schema';
import { BeeService } from '../bee/bee.service';
import { OrganizationService } from '../organization/organization.service';
import { PaymentService } from '../payment/payment.service';
import Stripe from 'stripe';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { StartSubscriptionDto } from './start-subscription.dto';
import { calculateDepthAndAmount, subscriptionConfig } from '../plan/subscriptions';
import { UsageMetricsService } from '../data/usage-metrics.service';
import { Plan } from '../plan/plan.schema';
import { Organization } from '../organization/organization.schema';
import { addMonths } from 'date-fns';

@Injectable()
export class BillingService {
  constructor(
    @InjectPinoLogger(BillingService.name)
    private readonly logger: PinoLogger,
    private planService: PlanService,
    private stripeService: StripeService,
    private paymentService: PaymentService,
    private beeService: BeeService,
    private organizationService: OrganizationService,
    private usageMetricsService: UsageMetricsService,
  ) {}

  async handleStripeNotification(rawRequestBody: Buffer, signature: string) {
    // const merchantTransactionId = notification['merchantTransactionId'];
    const event = await this.stripeService.handleNotification(rawRequestBody, signature);

    // const object = event.data.object as any;
    // this.logger.debug(`Received stripe event ${event.type}`);
    switch (event.type) {
      // successful payment and start of a subscription
      case 'checkout.session.completed':
        // console.log(event)
        // console.debug(object);
        const object = event.data.object as any;
        const merchantTransactionId = object.client_reference_id;
        const stripeCustomerId = object.customer;
        await this.handleCheckoutSessionCompleted(merchantTransactionId, stripeCustomerId);
        break;
      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
    }

    // const merchantTransactionId = 'x';
  }

  async initSubscriptionProcess(user: User, payload: StartSubscriptionDto) {
    //todo validate

    const selectedStorageOption = subscriptionConfig.storageCapacity.options.find(
      (o) => o.size === payload.uploadSizeLimit,
    );
    const selectedBandwidthOption = subscriptionConfig.bandwidth.options.find(
      (o) => o.size === payload.downloadSizeLimit,
    );

    if (!selectedStorageOption || !selectedBandwidthOption) {
      this.logger.error('Invalid pricing provided %o', payload);
      throw new BadRequestException('Invalid request');
    }
    const storageCapacity = selectedStorageOption.size;
    const bandwidth = selectedBandwidthOption.size;
    const storageAmount = storageCapacity * subscriptionConfig.storageCapacity.pricePerGb;
    const bandwidthAmount = bandwidth * subscriptionConfig.bandwidth.pricePerGb;

    const total = storageAmount + bandwidthAmount;
    const totalCents = Math.round((total + Number.EPSILON) * 100);

    const plan = await this.planService.createPlan({
      organizationId: user.organizationId,
      // name: template.name,
      amount: totalCents / 100,
      currency: subscriptionConfig.currency,
      frequency: 'MONTH',
      quotas: {
        uploadSizeLimit: storageCapacity * 1024 * 1024 * 1024,
        downloadSizeLimit: bandwidth * 1024 * 1024 * 1024,
        downloadCountLimit: 100_000,
        uploadCountLimit: 100_000,
      },
    });

    this.logger.info(`Initializing payment. User: ${user._id} Amount: ${plan.amount} ${plan.currency}`);
    const result = this.stripeService.initPayment(
      user.organizationId,
      plan._id.toString(),
      user._id.toString(),
      user.email,
      totalCents,
      plan.currency,
    );

    //todo add scheduled that closes payments after x hours, cleans up unpaid plans

    return result;
  }

  private async handleCheckoutSessionCompleted(merchantTransactionId: string, stripeCustomerId: string) {
    this.logger.info(
      `Processing checkoutSessionCompleted - merchantTransactionId: ${merchantTransactionId}, stripeCustomerId: ${stripeCustomerId}`,
    );

    const payment = await this.paymentService.getPaymentByMerchantTransactionId(merchantTransactionId);
    if (!payment) {
      throw new BadRequestException(`No payment found with id ${merchantTransactionId}`);
    }
    await this.paymentService.updatePayment(payment._id.toString(), { status: 'SUCCESS' });

    const org = await this.organizationService.getOrganization(payment.organizationId);
    const orgId = org._id.toString();
    const planIdToActivate = payment.planId;

    // todo validate status
    const planToActivate = await this.planService.getPlanById(orgId, planIdToActivate);
    if (planToActivate.status !== 'PENDING_PAYMENT') {
      this.logger.error(
        `Status of plan to activate must be PENDING_PAYMENT, but it's ${planToActivate.status}. Plan: ${planIdToActivate}`,
      );
    }
    const activePlan = await this.planService.getActivePlanForOrganization(orgId);
    if (activePlan) {
      await this.upgradeExistingPlanAndMetrics(activePlan, planToActivate);
      const newPlan = await this.activateNewPlan(orgId, planIdToActivate);
      this.topUpAndDilute(org, newPlan);
    } else {
      const plan = await this.activateNewPlan(orgId, planIdToActivate);
      this.buyPostageBatch(org, plan);
    }
  }

  private async upgradeExistingPlanAndMetrics(planToUpgrade: Plan, newPlan: Plan) {
    this.logger.info(`Upgrading plan ${planToUpgrade._id}`);
    await this.planService.updatePlan(planToUpgrade._id.toString(), {
      status: 'CANCELLED',
      statusReason: `UPGRADED_TO: ${newPlan._id}`,
    });
    await this.usageMetricsService.upgradeCurrentMetrics(planToUpgrade.organizationId, newPlan.quotas);
  }

  private async activateNewPlan(organizationId: string, planId: string) {
    this.logger.info(`Activating plan: ${planId}`);
    const plan = await this.planService.activatePlan(organizationId, planId);
    await this.usageMetricsService.upgradeCurrentMetrics(organizationId, plan.quotas);
    return plan;
  }

  private async handleInvoicePaid(object: Stripe.Invoice) {
    console.log(object);
    const merchantTransactionId = object.subscription_details.metadata.client_reference_id;
    this.logger.info(`Processing invoicePaid for merchantTransactionId: ${merchantTransactionId}`);

    // initial payment
    // todo check if client ref id is passed for recurring transactions. If not, look up org by email or sub id?
    const payment = await this.paymentService.getPaymentByMerchantTransactionId(merchantTransactionId);

    if (object.billing_reason === 'subscription_create') {
      this.logger.info(`Billing reason is 'subscription_create', skipping processing event.`);
    } else {
      // recurring payment, there must be already a plan at this point
      this.logger.debug(`Creating successful payment for plan: ${payment.planId}`);

      const plan = await this.planService.getPlanById(payment.organizationId, payment.planId);
      const org = await this.organizationService.getOrganization(payment.organizationId);
      const paidTill = addMonths(plan.paidTill, 1);
      await this.planService.updatePlan(payment.planId, { paidTill });
      await this.paymentService.createPayment({
        amount: object.amount_paid,
        currency: object.currency,
        planId: payment.planId,
        organizationId: payment.organizationId,
        status: 'SUCCESS',
      });
      this.topUp(org, plan);
    }
  }

  async cancelPlan(org: Organization) {
    this.logger.info(`Cancelling plan for organization ${org._id}.`);
    const plan = await this.planService.scheduleActivePlanForCancellation(org._id.toString());
    // todo cancel stripe subscription
  }

  private async buyPostageBatch(org: Organization, plan: Plan) {
    const organizationId = org._id.toString();
    await this.organizationService.update(organizationId, { postageBatchStatus: 'CREATING' });
    try {
      const requestedGbs = plan.quotas.uploadSizeLimit / 1024 / 1024 / 1024;
      // top up for 35 days for tolerating late recurring payments
      const days = org?.config?.topUpDays ?? 35;
      const config = calculateDepthAndAmount(days, requestedGbs);
      this.logger.info(
        `Creating postage batch. Amount: ${config.amount}, depth: ${config.depth}, cost: BZZ ${config.bzzPrice}`,
      );
      const batchId = await this.beeService.createPostageBatch(config.amount.toFixed(0), config.depth);
      this.logger.info(`Updating postback batch of organization ${organizationId} to ${batchId}`);
      await this.organizationService.update(organizationId, {
        postageBatchId: batchId,
        postageBatchStatus: 'CREATED',
      });
    } catch (e) {
      this.logger.error(e, `Failed to buy postage batch for organization ${organizationId}`);
      await this.organizationService.update(organizationId, { postageBatchStatus: 'FAILED_TO_CREATE' });
    }
  }

  private async topUp(org: Organization, plan: Plan) {
    const requestedGbs = plan.quotas.uploadSizeLimit / 1024 / 1024 / 1024;
    const days = org?.config?.topUpDays ?? 31;
    const config = calculateDepthAndAmount(days, requestedGbs);
    const amount = config.amount.toFixed(0);
    await this.tryTopUp(org, amount, days);
  }

  private async tryTopUp(org: Organization, amount: string, days: number) {
    try {
      this.logger.info(`Performing topUp on ${org.postageBatchId} with amount: ${amount}. (days: ${days})`);
      await this.beeService.topUp(org.postageBatchId, amount);
      return true;
    } catch (e) {
      this.logger.error(e, `TopUp operation failed. Org: ${org._id}`);
      await this.organizationService.update(org._id.toString(), { postageBatchStatus: 'FAILED_TO_TOP_UP' });
      return false;
    }
  }

  private async topUpAndDilute(org: Organization, plan: Plan) {
    //todo calculate minimum required top up amount
    //todo check if dilute is needed
    //todo store amount and depth?

    const requestedGbs = plan.quotas.uploadSizeLimit / 1024 / 1024 / 1024;
    const days = org?.config?.topUpDays ?? 31;
    const config = calculateDepthAndAmount(days, requestedGbs);
    const amount = config.amount.toFixed(0);
    const success: boolean = await this.tryTopUp(org, amount, days);
    if (!success) {
      this.logger.error(`TopUp operation failed. Skipping diluting. Org: ${org._id}`);
      return;
    }
    try {
      await this.beeService.dilute(org.postageBatchId, config.depth);
    } catch (e) {
      this.logger.error(e, `Dilute operation failed. Org: ${org._id}`);
      await this.organizationService.update(org._id.toString(), { postageBatchStatus: 'FAILED_TO_DILUTE' });
    }
  }
}
