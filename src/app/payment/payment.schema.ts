import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type PaymentDocument = HydratedDocument<Payment>;

@Schema({ timestamps: true })
export class Payment {
  _id: mongoose.Types.ObjectId;

  @Prop()
  providerTransactionId: string;

  @Prop()
  merchantTransactionId: string;

  @Prop({ required: true })
  organizationId: string;

  @Prop({ required: true })
  planId: string;

  @Prop()
  userId: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  currency: string;

  @Prop({ required: true })
  status: PaymentStatus;

  @Prop()
  statusReasonCode: string;
}

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILURE';

export const PaymentSchema = SchemaFactory.createForClass(Payment);
