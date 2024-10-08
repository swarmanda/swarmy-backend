import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './user.schema';
import { DataModule } from '../data/data.module';
import { OrganizationModule } from '../organization/organization.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    OrganizationModule,
    DataModule,
    EmailModule,
    MongooseModule.forFeature([
      {
        name: User.name,
        schema: UserSchema,
      },
    ]),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
