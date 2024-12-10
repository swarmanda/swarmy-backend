import { Injectable } from '@nestjs/common';

@Injectable()
export class AlertService {
  constructor() {}

  async sendAlert(message: string) {
    // TODO: Send alert
  }
}
