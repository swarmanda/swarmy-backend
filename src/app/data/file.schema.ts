import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type FileReferenceDocument = HydratedDocument<FileReference>;

@Schema({ timestamps: true })
export class FileReference {
  _id: mongoose.Types.ObjectId;

  @Prop()
  userId: string;

  @Prop({ required: true })
  organizationId: string;

  @Prop()
  thumbnailBase64: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  contentType: string;

  @Prop({ required: true })
  hash: string;

  @Prop({ default: 0 })
  size: number;

  @Prop({ default: 0 })
  hits: number;

  @Prop({ default: false })
  isWebsite: boolean;
}

export const FileReferenceSchema = SchemaFactory.createForClass(FileReference);
