import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class OrganizationConfig {
  @Prop()
  topUpDays: number;

  @Prop()
  stripeTestMode: boolean;
}
