import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type PaymentNotificationDocument = HydratedDocument<PaymentNotification>;

@Schema()
export class PaymentNotification {
  _id: mongoose.Types.ObjectId;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true, type: mongoose.Schema.Types.Mixed })
  body: object;
}

export const PaymentNotificationSchema = SchemaFactory.createForClass(PaymentNotification);
