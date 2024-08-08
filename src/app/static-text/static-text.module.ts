import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StaticTextController } from './static-text-controller';
import { StaticText, StaticTextSchema } from './static-text.schema';
import { StaticTextService } from './static-text.service';

@Module({
  imports: [MongooseModule.forFeature([{ name: StaticText.name, schema: StaticTextSchema }])],
  controllers: [StaticTextController],
  providers: [StaticTextService],
  exports: [],
})
export class StaticTextModule {}
