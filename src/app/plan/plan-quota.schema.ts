import { Prop, Schema } from '@nestjs/mongoose';

@Schema({ _id: false })
export class PlanQuota {
  @Prop({ required: true })
  uploadSizeLimit: number;

  @Prop({ required: true })
  uploadCountLimit: number;

  @Prop({ required: true })
  downloadSizeLimit: number;

  @Prop({ required: true })
  downloadCountLimit: number;
}
