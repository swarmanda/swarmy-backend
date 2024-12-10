import { Injectable } from '@nestjs/common';
import { Strings } from 'cafe-utility';
import { writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';

@Injectable()
export class PaymentNotificationService {
  constructor() {}

  async saveNotification(type: string, body: object) {
    await writeFile(
      join(tmpdir(), `stripe-${Date.now()}-${Strings.randomAlphanumeric(4)}.json`),
      JSON.stringify({ type, body }),
    );
  }
}
