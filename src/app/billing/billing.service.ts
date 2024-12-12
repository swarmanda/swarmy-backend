import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { Dates, Strings } from 'cafe-utility';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  getOnlyPlansRowOrThrow,
  insertPaymentsRow,
  insertPlansRow,
  OrganizationsRow,
  OrganizationsRowId,
  PlansRow,
  PlansRowId,
  updateOrganizationsRow,
  updatePaymentsRow,
  updatePlansRow,
  UsersRow,
} from 'src/DatabaseExtra';
import Stripe from 'stripe';
import { AlertService } from '../alert/alert.service';
import { BeeService } from '../bee/bee.service';
import { UsageMetricsService } from '../data/usage-metrics.service';
import { OrganizationService } from '../organization/organization.service';
import { PaymentService } from '../payment/payment.service';
import { StripeService } from '../payment/stripe.service';
import { PlanService } from '../plan/plan.service';
import { calculateDepthAndAmount, subscriptionConfig } from '../plan/subscriptions';
import { StartSubscriptionDto } from './start-subscription.dto';

const DAYS_TO_PURCHASE_POSTAGE_BATCH = 35;

@Injectable()
export class BillingService {
  constructor(
    @InjectPinoLogger(BillingService.name)
    private readonly logger: PinoLogger,
    private alertService: AlertService,
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

  async initSubscriptionProcess(user: UsersRow, payload: StartSubscriptionDto) {
    //todo validate

    const selectedStorageOption = subscriptionConfig.storageCapacity.options.find(
      (o) => o.size === payload.uploadSizeLimit,
    );
    const selectedBandwidthOption = subscriptionConfig.bandwidth.options.find(
      (o) => o.size === payload.downloadSizeLimit,
    );

    if (!selectedStorageOption || !selectedBandwidthOption) {
      const message = `Invalid pricing provided ${Strings.represent(payload)}`;
      this.alertService.sendAlert(message);
      this.logger.error(message);
      throw new BadRequestException(message);
    }

    await this.verifyWalletBalance(DAYS_TO_PURCHASE_POSTAGE_BATCH, selectedStorageOption.size);

    const storageCapacity = selectedStorageOption.size;
    const bandwidth = selectedBandwidthOption.size;
    const storageAmount = storageCapacity * subscriptionConfig.storageCapacity.pricePerGb;
    const bandwidthAmount = bandwidth * subscriptionConfig.bandwidth.pricePerGb;

    const total = storageAmount + bandwidthAmount;
    const totalCents = Math.round((total + Number.EPSILON) * 100);

    const planId = await insertPlansRow({
      organizationId: user.organizationId,
      amount: totalCents / 100,
      currency: subscriptionConfig.currency,
      frequency: 'MONTH',
      uploadSizeLimit: storageCapacity * 1024 * 1024 * 1024,
      downloadSizeLimit: bandwidth * 1024 * 1024 * 1024,
      downloadCountLimit: 100_000,
      uploadCountLimit: 100_000,
      status: 'PENDING_PAYMENT',
    });
    const plan = await getOnlyPlansRowOrThrow({ id: planId });

    this.logger.info(`Initializing payment. User: ${user.id} Amount: ${plan.amount} ${plan.currency}`);
    const result = this.stripeService.initPayment(user.organizationId, plan.id, user.email, totalCents, plan.currency);

    //todo add scheduled that closes payments after x hours, cleans up unpaid plans

    return result;
  }

  private async verifyWalletBalance(days: number, gbs: number) {
    const bzzBalance = await this.beeService.getWalletBzzBalance();
    const result = calculateDepthAndAmount(days, gbs);

    if (bzzBalance <= result.bzzPrice) {
      const message = `Can't initialize subscription. Wallet balance is insufficient. Available: ${bzzBalance} Required: ${result.bzzPrice}`;
      this.alertService.sendAlert(message);
      throw new InternalServerErrorException(message);
    }
  }

  private async handleCheckoutSessionCompleted(merchantTransactionId: string, stripeCustomerId: string) {
    this.logger.info(
      `Processing checkoutSessionCompleted - merchantTransactionId: ${merchantTransactionId}, stripeCustomerId: ${stripeCustomerId}`,
    );

    const payment = await this.paymentService.getPaymentByMerchantTransactionId(merchantTransactionId);
    if (!payment) {
      throw new BadRequestException(`No payment found with id ${merchantTransactionId}`);
    }
    await updatePaymentsRow(payment.id, { status: 'SUCCESS' });

    const organization = await this.organizationService.getOrganization(payment.organizationId);
    const planIdToActivate = payment.planId;

    const planToActivate = await this.planService.getPlanById(organization.id, planIdToActivate);
    if (planToActivate.status !== 'PENDING_PAYMENT') {
      const message = `Plan ${planIdToActivate} to activate must be PENDING_PAYMENT, but it's ${planToActivate.status}`;
      this.alertService.sendAlert(message);
      this.logger.error(message);
      return;
    }
    const activePlan = await this.planService.getActivePlanForOrganization(organization.id);
    if (activePlan) {
      await this.cancelExistingPlanForUpgrade(activePlan, planToActivate);
      const newPlan = await this.activateNewPlan(organization.id, planIdToActivate);
      this.topUpAndDilute(organization, newPlan);
    } else {
      const plan = await this.activateNewPlan(organization.id, planIdToActivate);
      this.buyPostageBatch(organization, plan);
    }
  }

  private async cancelExistingPlanForUpgrade(planToCancel: PlansRow, planToUpgradeTo: PlansRow) {
    this.logger.info(`Cancelling plan ${planToCancel.id}, upgrading to ${planToUpgradeTo.id}`);
    updatePlansRow(planToCancel.id, {
      status: 'CANCELLED',
      statusReason: `UPGRADED_TO: ${planToUpgradeTo.id}`,
    });
  }

  private async activateNewPlan(organizationId: OrganizationsRowId, planId: PlansRowId) {
    this.logger.info(`Activating plan: ${planId}`);
    const plan = await this.planService.activatePlan(organizationId, planId);
    await this.usageMetricsService.upgradeCurrentMetrics(organizationId, plan.uploadSizeLimit, plan.downloadSizeLimit);
    return plan;
  }

  private async handleInvoicePaid(object: Stripe.Invoice) {
    console.log(object);
    const merchantTransactionId = object?.subscription_details?.metadata?.client_reference_id;
    if (!merchantTransactionId) {
      const message = 'No merchantTransactionId found in invoicePaid event.';
      this.alertService.sendAlert(message);
      throw new InternalServerErrorException(message);
    }
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
      const organization = await this.organizationService.getOrganization(payment.organizationId);
      if (!plan.paidUntil) {
        const message = `Plan ${plan.id} has no paidUntil date.`;
        this.alertService.sendAlert(message);
        throw new InternalServerErrorException(message);
      }
      const paidUntil = new Date(Date.now() + Dates.days(31));
      await updatePlansRow(plan.id, { paidUntil });
      await insertPaymentsRow({
        amount: object.amount_paid,
        currency: object.currency,
        planId: payment.planId,
        organizationId: payment.organizationId,
        status: 'SUCCESS',
        merchantTransactionId,
      });
      this.topUp(organization, plan);
    }
  }

  async cancelPlan(organization: OrganizationsRow) {
    this.logger.info(`Cancelling plan for organization ${organization.id}.`);
    await this.planService.scheduleActivePlanForCancellation(organization.id);
    // todo cancel stripe subscription
  }

  private async buyPostageBatch(organization: OrganizationsRow, plan: PlansRow) {
    const organizationId = organization.id;
    await updateOrganizationsRow(organizationId, { postageBatchStatus: 'CREATING' });
    try {
      const requestedGbs = plan.uploadSizeLimit / 1024 / 1024 / 1024;
      // top up for 35 days for tolerating late recurring payments
      const days = DAYS_TO_PURCHASE_POSTAGE_BATCH;
      const config = calculateDepthAndAmount(days, requestedGbs);
      this.logger.info(
        `Creating postage batch. Amount: ${config.amount}, depth: ${config.depth}, cost: BZZ ${config.bzzPrice}`,
      );
      const batchId = await this.beeService.createPostageBatch(config.amount.toFixed(0), config.depth);
      this.logger.info(`Updating postback batch of organization ${organizationId} to ${batchId}`);
      await updateOrganizationsRow(organizationId, { postageBatchId: batchId, postageBatchStatus: 'CREATED' });
    } catch (e) {
      const message = `Failed to buy postage batch for organization ${organizationId}`;
      this.alertService.sendAlert(message);
      this.logger.error(e, message);
      await updateOrganizationsRow(organizationId, { postageBatchStatus: 'FAILED_TO_CREATE' });
    }
  }

  private async topUp(organization: OrganizationsRow, plan: PlansRow) {
    const requestedGbs = plan.uploadSizeLimit / 1024 / 1024 / 1024;
    const days = 31;
    const config = calculateDepthAndAmount(days, requestedGbs);
    const amount = config.amount.toFixed(0);
    await this.tryTopUp(organization, amount, days);
  }

  private async tryTopUp(organization: OrganizationsRow, amount: string, days: number) {
    if (!organization.postageBatchId) {
      const message = `Organization ${organization.id} has no postage batch id. Failing top up.`;
      this.alertService.sendAlert(message);
      this.logger.error(message);
      throw new InternalServerErrorException(message);
    }
    try {
      this.logger.info(`Performing topUp on ${organization.postageBatchId} with amount: ${amount}. (days: ${days})`);
      await this.beeService.topUp(organization.postageBatchId, amount);
      this.logger.info(
        `TopUp completed successfully on ${organization.postageBatchId} with amount: ${amount}. (days: ${days})`,
      );
      return true;
    } catch (e) {
      const message = `TopUp operation failed. Org: ${organization.id}`;
      this.alertService.sendAlert(message, e);
      this.logger.error(e, message);
      await updateOrganizationsRow(organization.id, { postageBatchStatus: 'FAILED_TO_TOP_UP' });
      return false;
    }
  }

  private async topUpAndDilute(organization: OrganizationsRow, plan: PlansRow) {
    if (!organization.postageBatchId) {
      const message = `Organization ${organization.id} has no postage batch id. Failing top up and dilute.`;
      this.alertService.sendAlert(message);
      throw new InternalServerErrorException(message);
    }
    //todo calculate minimum required top up amount
    //todo check if dilute is needed
    //todo store amount and depth?

    const requestedGbs = plan.uploadSizeLimit / 1024 / 1024 / 1024;
    const days = 31;
    const config = calculateDepthAndAmount(days, requestedGbs);
    const amount = config.amount.toFixed(0);
    const success: boolean = await this.tryTopUp(organization, amount, days);
    if (!success) {
      const message = `TopUp operation failed. Skipping diluting. Org: ${organization.id}`;
      this.alertService.sendAlert(message);
      this.logger.error(message);
      return;
    }
    try {
      await this.beeService.dilute(organization.postageBatchId, config.depth);
      this.logger.info(`Dilute successful dilute on ${organization.postageBatchId} with depth: ${config.depth}`);
    } catch (e) {
      const message = `Dilute operation failed. Org: ${organization.id}`;
      this.alertService.sendAlert(message, e);
      this.logger.error(e, message);
      await updateOrganizationsRow(organization.id, { postageBatchStatus: 'FAILED_TO_DILUTE' });
    }
  }
}
