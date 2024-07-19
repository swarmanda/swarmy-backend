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

@Injectable()
export class BillingService {
  constructor(
    @InjectPinoLogger(BillingService.name)
    private readonly logger: PinoLogger,
    private planService: PlanService,
    private paymentProviderService: StripeService,
    private paymentService: PaymentService,
    private beeService: BeeService,
    private organizationService: OrganizationService,
  ) {}

  async handleStripeNotification(rawRequestBody: Buffer, signature: string) {
    // const merchantTransactionId = notification['merchantTransactionId'];
    const event = await this.paymentProviderService.handleNotification(rawRequestBody, signature);

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
    //todo consider merging phase 2

    // const template = await this.planService.getPlanTemplateById(planTemplateId);
    const selectedStorageOption = subscriptionConfig.storageCapacity.options.find((o) => o.value === payload.uploadSizeLimit);
    const selectedBandwidthOption = subscriptionConfig.bandwidth.options.find((o) => o.value === payload.downloadSizeLimit);

    if (!selectedStorageOption || !selectedBandwidthOption) {
      this.logger.error('Invalid pricing provided %o', payload);
      throw new BadRequestException('Invalid request');
    }
    const storageCapacity = 2 ** selectedStorageOption.value
    const bandwidth  = 2 ** selectedBandwidthOption.value
    const storageAmount = storageCapacity * subscriptionConfig.storageCapacity.pricePerGb
    const bandwidthAmount = bandwidth * subscriptionConfig.bandwidth.pricePerGb

    const total = storageAmount + bandwidthAmount
    const totalCents = Math.round((total + Number.EPSILON) * 100)


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
        uploadCountLimit: 100_000
      },
    });

    this.logger.info(`Initializing payment. User: ${user._id} Amount: ${plan.amount} ${plan.currency}` )
    const result = this.paymentProviderService.initPayment(
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

    // todo get plan and validate status
    this.logger.info(`Activating plan: ${payment.planId}`);

    const plan = await this.planService.activatePlan(payment.organizationId, payment.planId);
    const amount = 414720000; // one day
    const depth = 17;
    const batchId = await this.beeService.createPostageBatch(amount.toFixed(0), depth);
    this.logger.info(`Updateing postback batch of organization ${payment.organizationId} to ${batchId}`);
    await this.organizationService.update(payment.organizationId, {
      postageBatchId: batchId,
    });
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
}
