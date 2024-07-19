import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type QuotaMetricsDocument = HydratedDocument<QuotaMetrics>;

@Schema()
export class QuotaMetrics {
  _id: mongoose.Types.ObjectId;

  @Prop({ required: true })
  organizationId: string;

  @Prop({ default: 0 })
  uploadedFilesCount: number;

  @Prop({ default: 0 })
  uploadedFilesSize: number;

  @Prop({ default: 0 })
  downloadedFilesCount: number;

  @Prop({ default: 0 })
  downloadedFilesSize: number;
}

export const QuotaMetricsSchema = SchemaFactory.createForClass(QuotaMetrics);
