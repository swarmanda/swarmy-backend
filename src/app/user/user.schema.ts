import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema()
export class User {
  _id: mongoose.Types.ObjectId;

  @Prop({ unique: true })
  email: string;

  @Prop()
  password: string;

  @Prop()
  organizationId: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
