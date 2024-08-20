import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  _id: mongoose.Types.ObjectId;

  @Prop({ unique: true })
  email: string;

  @Prop()
  password: string;

  @Prop()
  organizationId: string;

  @Prop()
  emailVerified: boolean;

  @Prop()
  emailVerificationCode: string;

  @Prop()
  resetPasswordToken: string;

  @Prop({ required: true })
  enabled: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
