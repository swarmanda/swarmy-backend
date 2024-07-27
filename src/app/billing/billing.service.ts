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
import { subscriptionConfig } from '../plan/subscription.constants';
import { UsageMetricsService } from '../data/usage-metrics.service';
import { Plan } from '../plan/plan.schema';
import { Organization } from '../organization/organization.schema';

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
        console.log(event.data);
        console.log(event.data.object);
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

    // todo get plan and validate status
    const planToActivate = await this.planService.getActivePlanForOrganization(planIdToActivate);
    const activePlan = await this.planService.getActivePlanForOrganization(orgId);
    if (activePlan) {
      await this.upgradeExistingPlanAndMetrics(activePlan, planToActivate);
      await this.activateNewPlan(orgId, planIdToActivate);
      await this.topUpAndDilute(org);
    } else {
      const plan = await this.activateNewPlan(orgId, planIdToActivate);
      this.buyPostageStamp(orgId, plan);
    }
  }

  private async buyPostageStamp(organizationId: string, plan: Plan) {
    const requestedGbs = plan.quotas.uploadSizeLimit / 1024 / 1024 / 1024;
    const exp = Math.log2(requestedGbs)
    const diff = exp + 1;
    const amount = 414720000; // one day

    const depth = 17 + diff; //min 17, 17 is 512MB
    const batchId = await this.beeService.createPostageBatch(amount.toFixed(0), depth);
    this.logger.info(`Updating postback batch of organization ${organizationId} to ${batchId}`);
    await this.organizationService.update(organizationId, {
      postageBatchId: batchId,
    });
  }

  private async upgradeExistingPlanAndMetrics(planToUpgrade: Plan, newPlan: Plan) {
    this.logger.info(`Upgrading plan ${planToUpgrade._id}`);
    await this.planService.updatePlan(planToUpgrade._id.toString(), {
      status: 'CANCELLED',
      statusReason: `UPGRADED_TO: ${newPlan._id}`,
    });
    await this.usageMetricsService.upgrade(planToUpgrade.organizationId, newPlan.quotas);
  }

  private async activateNewPlan(organizationId: string, planId: string) {
    this.logger.info(`Activating plan: ${planId}`);
    const plan = await this.planService.activatePlan(organizationId, planId);
    await this.usageMetricsService.upgrade(organizationId, plan.quotas);
    return plan;
  }

  private async handleInvoicePaid(object: Stripe.Invoice) {
    console.log(object);
    const merchantTransactionId = object.subscription_details.metadata.client_reference_id;
    this.logger.info(`Processing invoicePaid for merchantTransactionId: ${merchantTransactionId}`);

    const payment = await this.paymentService.getPaymentByMerchantTransactionId(merchantTransactionId);

    if (object.billing_reason === 'subscription_create') {
      this.logger.info(`Billing reason is 'subscription_create', skipping processing event.`);
    } else {
      // recurring payment, there must be already one
      // todo check if client ref id is passed for recurring transactions
      // todo swarm topup
      const payment = await this.paymentService.getPaymentByMerchantTransactionId(merchantTransactionId);
      this.logger.debug(`Creating successful payment for plan: ${payment.planId}`);

      await this.paymentService.createPayment({
        amount: object.amount_paid,
        currency: object.currency,
        planId: payment.planId,
        organizationId: payment.organizationId,
        status: 'SUCCESS',
      });
    }

    //
    // let stripeCustomerId = null;
    // const customer = stripeCustomerId as Stripe.Customer;
    // if (typeof object.customer === 'string') {
    //   stripeCustomerId = object.customer;
    // } else {
    //   stripeCustomerId = object.customer.id;
    // }

    // let plan = null;
    // const maxRetries = 10;
    // for (let i = 1; i <= maxRetries; i++) {
    //   plan = this.planService.getActivePlanByStripeCustomerId(stripeCustomerId);
    //   if (plan) {
    //     break;
    //   } else {
    //     this.logger.debug(`Can't find plan by stripeCustomerId ${stripeCustomerId}. Retrying (${i}/${maxRetries})`);
    //   }
    // }
    // if (!plan) {
    //   this.logger.error(`Failed to retrieve plan by stripeCustomerId ${stripeCustomerId}. Ran out of retries.`);
    //   return;
    // }
    //
    // this.logger.debug(`Creating successful payment for plan: ${plan.id}`);
    //
    // await this.paymentService.createPayment({
    //   amount: object.amount_paid,
    //   currency: object.currency,
    //   planId: plan.id,
    //   organizationId: plan.organizationId,
    //   status: 'SUCCESS',
    // });
  }

  async cancelPlan(org: Organization) {
    this.logger.info(`Cancelling plan for organization ${org._id}.`);
    const plan = await this.planService.cancelActivePlan(org._id.toString());
    this.logger.info(`Removing postageBatchId ${org.postageBatchId} from organization ${org._id}.`);
    await this.organizationService.update(org._id.toString(), { postageBatchId: null });
    await this.usageMetricsService.resetCurrentMetrics(org._id.toString());
    // todo cancel stripe subscription
  }

  private async topUpAndDilute(org: Organization) {
    const amount = 414720000; // one day
    const depth = 17;
    await this.beeService.topUp(org.postageBatchId, amount.toFixed(0));
    await this.beeService.dilute(org.postageBatchId, depth);
  }
}
