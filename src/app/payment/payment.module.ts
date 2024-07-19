import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { Payment, PaymentSchema } from './payment.schema';
import { StripeService } from './stripe.service';
import { PaymentNotification, PaymentNotificationSchema } from './payment-notification.schema';
import { PaymentNotificationService } from './payment-notification.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Payment.name, schema: PaymentSchema }]),
    MongooseModule.forFeature([{ name: PaymentNotification.name, schema: PaymentNotificationSchema }]),
  ],
  controllers: [PaymentController],
  providers: [PaymentService, StripeService, PaymentNotificationService],
  exports: [PaymentService, StripeService],
})
export class PaymentModule {}
