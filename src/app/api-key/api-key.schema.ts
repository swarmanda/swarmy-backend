import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type ApiKeyDocument = HydratedDocument<ApiKey>;

@Schema({ timestamps: true })
export class ApiKey {
  _id: mongoose.Types.ObjectId;

  @Prop({ required: true })
  organizationId: string;

  @Prop({ required: true })
  key: string;

  @Prop({ required: true })
  status: 'ACTIVE' | 'REVOKED';
}

export const ApiKeySchema = SchemaFactory.createForClass(ApiKey);
