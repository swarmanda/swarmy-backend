import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import {
  getOnlyOrganizationsRowOrThrow,
  insertOrganizationsRow,
  OrganizationsRow,
  OrganizationsRowId,
} from 'src/DatabaseExtra';

@Injectable()
export class OrganizationService {
  constructor(
    @InjectPinoLogger(OrganizationService.name)
    private readonly logger: PinoLogger,
  ) {}

  async getOrganization(id: OrganizationsRowId): Promise<OrganizationsRow> {
    return getOnlyOrganizationsRowOrThrow({ id });
  }

  async create(name: string): Promise<OrganizationsRow> {
    const id = await insertOrganizationsRow({ name });
    this.logger.info('Organization created', name);
    return this.getOrganization(id);
  }
}
