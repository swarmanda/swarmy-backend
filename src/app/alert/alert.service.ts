import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Strings, Types } from 'cafe-utility';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class AlertService {
  private readonly telegramToken: string;
  private readonly chatId: number;

  constructor(
    @InjectPinoLogger(AlertService.name)
    private readonly logger: PinoLogger,
    configService: ConfigService,
  ) {
    this.telegramToken = Types.asString(configService.get<string>('TELEGRAM_TOKEN'), { name: 'TELEGRAM_TOKEN' });
    this.chatId = Types.asId(configService.get<string>('TELEGRAM_CHAT_ID'), { name: 'TELEGRAM_CHAT_ID' });
    this.sendAlert('Server started');
  }

  async sendAlert(message: string, error?: Error) {
    axios
      .post(`https://api.telegram.org/bot${this.telegramToken}/sendMessage`, {
        chat_id: this.chatId,
        text: error ? `${message} ${Strings.represent(error)}` : message,
      })
      .catch((e) => {
        this.logger.error('Failed to send alert', e);
      });
  }
}
