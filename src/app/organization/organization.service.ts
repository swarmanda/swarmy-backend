import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Organization } from './organization.schema';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectPinoLogger(OrganizationService.name)
    private readonly logger: PinoLogger,
    @InjectModel(Organization.name)
    private organizationModel: Model<Organization>,
  ) {}

  async getOrganization(id: string): Promise<Organization> {
    this.organizationModel.updateMany({}, { enabled: true });

    return this.organizationModel.findOne({ _id: id });
  }

  async create(name: string): Promise<Organization> {
    const organization = await new this.organizationModel({ name, enabled: true }).save();
    this.logger.info('Organization created', name);
    return organization;
  }

  async update(id: string, values: Partial<Organization>): Promise<Organization> {
    const organization = await this.organizationModel.findOneAndUpdate({ _id: id }, values);

    this.logger.info('Organization updated', organization);
    return organization;
  }
}
