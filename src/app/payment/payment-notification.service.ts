import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PaymentNotification } from './payment-notification.schema';

@Injectable()
export class PaymentNotificationService {
  constructor(
    @InjectModel(PaymentNotification.name)
    private paymentNotificationModel: Model<PaymentNotification>,
  ) {}

  async saveNotification(type: string, body: object) {
    return await new this.paymentNotificationModel({
      type,
      body,
    }).save();
  }
}
