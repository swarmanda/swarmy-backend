import { Injectable } from '@nestjs/common';
import { getOnlyStaticTextsRowOrNull } from 'src/DatabaseExtra';

@Injectable()
export class StaticTextService {
  constructor() {}

  async getStaticText(label: string) {
    const result = await getOnlyStaticTextsRowOrNull({ label });

    return result?.value || 'Not defined';
  }
}
