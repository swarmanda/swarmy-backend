import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type StaticTextDocument = HydratedDocument<StaticText>;

@Schema()
export class StaticText {
  _id: mongoose.Types.ObjectId;

  @Prop({ required: true })
  key: string;

  @Prop({ required: true })
  value: string;
}

export const StaticTextSchema = SchemaFactory.createForClass(StaticText);
