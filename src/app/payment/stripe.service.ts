import { Injectable } from '@nestjs/common';
import { randomStringGenerator } from '@nestjs/common/utils/random-string-generator.util';
import { ConfigService } from '@nestjs/config';
import { Types } from 'cafe-utility';
import { OrganizationsRowId, PlansRowId } from 'src/DatabaseExtra';
import Stripe from 'stripe';
import { PaymentNotificationService } from './payment-notification.service';
import { PaymentService } from './payment.service';

@Injectable()
export class StripeService {
  private stripeClient: Stripe;
  private readonly frontendUrl: string;
  private readonly webhookSecret: string;
  private readonly productId: string;

  constructor(
    configService: ConfigService,
    private paymentService: PaymentService,
    private paymentNotificationService: PaymentNotificationService,
  ) {
    this.frontendUrl = Types.asString(configService.get<string>('FRONTEND_URL'), { name: 'FRONTEND_URL' });
    this.webhookSecret = Types.asString(configService.get<string>('STRIPE_WEBHOOK_SECRET'), {
      name: 'STRIPE_WEBHOOK_SECRET',
    });
    this.productId = Types.asString(configService.get<string>('STRIPE_PRODUCT_ID'), { name: 'STRIPE_PRODUCT_ID' });
    const apiKey = Types.asString(configService.get<string>('STRIPE_API_KEY'), { name: 'STRIPE_API_KEY' });
    this.stripeClient = new Stripe(apiKey);
  }

  async initPayment(
    organizationId: OrganizationsRowId,
    planId: PlansRowId,
    userEmail: string,
    amount: number,
    currency: string,
  ) {
    const merchantTransactionId = randomStringGenerator();
    await this.paymentService.createPendingPayment(amount, currency, merchantTransactionId, organizationId, planId);

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
