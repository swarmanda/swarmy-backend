import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { PlanQuota } from './plan-quota.schema';

export type PlanDocument = HydratedDocument<Plan>;

@Schema({ timestamps: true })
export class Plan {
  _id: mongoose.Types.ObjectId;

  @Prop({ required: true })
  organizationId: string;

  @Prop()
  name: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  currency: string;

  @Prop({ required: true })
  frequency: string;

  @Prop({ required: true })
  status: PlanStatus;

  @Prop()
  statusReason: string;

  @Prop({ required: true, type: PlanQuota })
  quotas: PlanQuota;
  //
  // @Prop()
  // stripeCustomerId: string;
}

export type PlanStatus = 'PENDING_PAYMENT' | 'ACTIVE' | 'CANCELLED';

export const PlanSchema = SchemaFactory.createForClass(Plan);
