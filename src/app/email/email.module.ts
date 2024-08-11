import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Email, EmailSchema } from './email.schema';
import { EmailService } from './email.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Email.name, schema: EmailSchema }])],
  controllers: [],
  providers: [EmailService],
  exports: [EmailService],
})
export class EmailModule {}
