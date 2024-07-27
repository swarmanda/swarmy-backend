import { Controller, Get } from '@nestjs/common';
import { Public } from '../auth/public.decorator';

@Controller()
export class HealthcheckController {
  @Public()
  @Get('/healthcheck')
  async healthcheck() {
    return { status: 'OK' };
  }
}
