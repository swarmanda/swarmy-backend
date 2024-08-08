import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { StaticText } from './static-text.schema';

@Injectable()
export class StaticTextService {
  constructor(@InjectModel(StaticText.name) private staticTextModel: Model<StaticText>) {}

  async getStaticText(key: string) {
    const result = (await this.staticTextModel.findOne({
      key,
    })) as StaticText;

    return result?.value || 'Not defined';
  }
}
