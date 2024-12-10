import { Module } from '@nestjs/common';
import { DataModule } from '../data/data.module';
import { EmailModule } from '../email/email.module';
import { OrganizationModule } from '../organization/organization.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [OrganizationModule, DataModule, EmailModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
