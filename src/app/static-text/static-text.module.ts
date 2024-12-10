import { Module } from '@nestjs/common';
import { StaticTextController } from './static-text-controller';
import { StaticTextService } from './static-text.service';

@Module({
  controllers: [StaticTextController],
  providers: [StaticTextService],
  exports: [],
})
export class StaticTextModule {}
