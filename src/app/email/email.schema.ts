import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type EmailDocument = HydratedDocument<Email>;

@Schema()
export class Email {
  _id: mongoose.Types.ObjectId;

  @Prop({ unique: true })
  name: string;

  @Prop()
  postageBatchId: string;

  @Prop()
  postageBatchStatus: null | 'CREATING' | 'CREATED' | 'FAILED_TO_CREATE' | 'FAILED_TO_TOP_UP' | 'FAILED_TO_DILUTE';
}

export const EmailSchema = SchemaFactory.createForClass(Email);
