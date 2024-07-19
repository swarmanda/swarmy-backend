import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Organization, OrganizationSchema } from './organization.schema';
import { OrganizationService } from './organization.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: Organization.name, schema: OrganizationSchema }])],
  controllers: [],
  providers: [OrganizationService],
  exports: [OrganizationService],
})
export class OrganizationModule {}
