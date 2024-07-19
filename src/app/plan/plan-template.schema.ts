import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { PlanQuota } from './plan-quota.schema';

export type PlanTemplateDocument = HydratedDocument<PlanTemplate>;

@Schema()
export class PlanTemplate {
  _id: mongoose.Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true })
  currency: string;

  @Prop({ required: true })
  frequency: string;

  @Prop({ required: true })
  enabled: boolean;

  @Prop({ required: true })
  order: number;

  @Prop({ required: true, type: PlanQuota })
  quotas: PlanQuota;
}

export const PlanTemplateSchema = SchemaFactory.createForClass(PlanTemplate);
