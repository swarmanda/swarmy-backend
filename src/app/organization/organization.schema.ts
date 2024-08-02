import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { OrganizationConfig } from './organization-config.schema';

export type OrganizationDocument = HydratedDocument<Organization>;

@Schema()
export class Organization {
  _id: mongoose.Types.ObjectId;

  @Prop({ unique: true })
  name: string;

  @Prop()
  postageBatchId: string;

  @Prop()
  postageBatchStatus: null | 'CREATING' | 'CREATED' | 'FAILED_TO_CREATE' | 'FAILED_TO_TOP_UP' | 'FAILED_TO_DILUTE';

  @Prop({ type: OrganizationConfig })
  config?: OrganizationConfig;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);
