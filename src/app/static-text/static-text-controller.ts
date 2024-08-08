import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { StaticTextService } from './static-text.service';

@Controller()
export class StaticTextController {
  constructor(private readonly staticTextService: StaticTextService) {}

  @Public()
  @Get('/static-text/:key')
  getStaticText(@Param('key') key: string) {
    return this.staticTextService.getStaticText(key);
  }
}
