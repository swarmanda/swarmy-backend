import { Controller, Get } from '@nestjs/common';
import { MigrationService } from './migration.service';

@Controller('migration')
export class MigrationController {
  constructor(private readonly migrationService: MigrationService) {}

  @Get('/start')
  async startMigration() {
    await this.migrationService.start();
  }
}
