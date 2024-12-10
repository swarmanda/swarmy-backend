import { Module } from '@nestjs/common';
import { AlertModule } from '../alert/alert.module';
import { EmailService } from './email.service';

@Module({
  providers: [EmailService],
  exports: [EmailService],
  imports: [AlertModule],
})
export class EmailModule {}
