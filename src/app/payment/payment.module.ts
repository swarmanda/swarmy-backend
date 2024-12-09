import { Module } from '@nestjs/common';
import { PaymentNotificationService } from './payment-notification.service';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { StripeService } from './stripe.service';

@Module({
  controllers: [PaymentController],
  providers: [PaymentService, StripeService, PaymentNotificationService],
  exports: [PaymentService, StripeService],
})
export class PaymentModule {}
