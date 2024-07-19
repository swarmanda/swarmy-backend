import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment } from './payment.schema';

@Injectable()
export class PaymentService {
  constructor(@InjectModel(Payment.name) private paymentModel: Model<Payment>) {}

  async createPendingPayment(
    amount: number,
    currency: string,
    merchantTransactionId: string,
    organizationId: string,
    userId: string,
    planId: string,
  ) {
    await new this.paymentModel({
      merchantTransactionId,
      organizationId,
      planId,
      userId,
      amount,
      currency,
      status: 'PENDING',
    }).save();
  }

  async getPaymentByMerchantTransactionId(merchantTransactionId: string) {
    return this.paymentModel.findOne({ merchantTransactionId });
  }

  async updatePayment(id: string, payload: Partial<Payment>) {
    await this.paymentModel.findOneAndUpdate({ _id: id }, payload);
  }

  async createPayment(payment: {
    organizationId: string;
    amount: number;
    currency: string;
    planId: any;
    status: string;
  }) {
    await new this.paymentModel({ ...payment }).save();
  }
}
