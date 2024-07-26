import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment } from './payment.schema';
import { PaymentService } from './payment.service';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import Stripe from 'stripe';
import { PaymentNotificationService } from './payment-notification.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class StripeService {
  private stripeClient: Stripe;
  private readonly frontendUrl: string;
  private readonly webhookSecret: string;
  private readonly productId: string;

  constructor(
    configService: ConfigService,
    @InjectModel(Payment.name) private paymentModel: Model<Payment>,
    private paymentService: PaymentService,
    private paymentNotificationService: PaymentNotificationService,
  ) {
    this.frontendUrl = configService.get<string>('FRONTEND_URL');
    this.webhookSecret = configService.get<string>('STRIPE_WEBHOOK_SECRET');
    this.productId = configService.get<string>('STRIPE_PRODUCT_ID');
    const apiKey = configService.get<string>('STRIPE_API_KEY');
    this.stripeClient = new Stripe(apiKey);
  }

  async initPayment(
    organizationId: string,
    planId: string,
    userId: string,
    userEmail: string,
    amount: number,
    currency: string,
  ) {
    const merchantTransactionId = randomStringGenerator();
    await this.paymentService.createPendingPayment(
      amount,
      currency,
      merchantTransactionId,
      organizationId,
      userId,
      planId,
    );

    const session = await this.stripeClient.checkout.sessions.create({
      billing_address_collection: 'auto',
      customer_email: userEmail,
      client_reference_id: merchantTransactionId,
      line_items: [
        {
          price_data: {
            unit_amount: amount,
            currency: currency,
            product: this.productId,
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      subscription_data: {
        metadata: {
          client_reference_id: merchantTransactionId,
        },
      },
      mode: 'subscription',
      success_url: `${this.frontendUrl}/app/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.frontendUrl}/app/billing?canceled=true`,
    });

    return {
      redirectUrl: session.url,
    };
  }

  verifyAndParseEvent(requestBody: any, signature: string) {
    //todo handle exception properly
    const event = this.stripeClient.webhooks.constructEvent(requestBody, signature, this.webhookSecret);
    return event;
  }

  async handleNotification(requestBody: any, signature: string) {
    const event = this.verifyAndParseEvent(requestBody, signature);
    await this.paymentNotificationService.saveNotification(event.type, event);

    return event;
  }
}
