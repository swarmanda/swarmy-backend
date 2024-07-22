import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import mongooseLong from 'mongoose-long';
// mongooseLong(mongoose);

export type UsageMetricsDocument = HydratedDocument<UsageMetrics>;

@Schema()
export class UsageMetrics {
  _id: mongoose.Types.ObjectId;

  @Prop({ required: true })
  organizationId: string;

  @Prop({ required: true })
  period: string;

  @Prop({ required: true })
  type: UsageMetricType;

  @Prop({ required: true })
  available: number;

  @Prop({ type: mongoose.Schema.Types.Long, required: true })
  used: number;
}

export type UsageMetricType = 'UPLOADED_BYTES' | 'DOWNLOADED_BYTES';

export const UsageMetricsSchema = SchemaFactory.createForClass(UsageMetrics);
