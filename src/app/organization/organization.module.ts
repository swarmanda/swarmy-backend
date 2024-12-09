import { Module } from '@nestjs/common';
import { OrganizationService } from './organization.service';

@Module({
  controllers: [],
  providers: [OrganizationService],
  exports: [OrganizationService],
})
export class OrganizationModule {}
