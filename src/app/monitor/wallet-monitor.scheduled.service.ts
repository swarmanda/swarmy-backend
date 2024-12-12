import { Injectable } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { BeeService } from '../bee/bee.service';
import { BZZ } from '../token/bzz';

const TEN_MINUTES = 10 * 60 * 1000;

@Injectable()
export class WalletMonitorScheduledService {
  constructor(
    @InjectPinoLogger(WalletMonitorScheduledService.name)
    private readonly logger: PinoLogger,
    private readonly beeService: BeeService,
  ) {}

  @Interval(TEN_MINUTES)
  async checkPostageBatchTTL() {
    const wallet = await this.beeService.getWallet();
    this.logger.info(`Wallet Monitor - balance is ${new BZZ(wallet.bzzBalance).toString()} BZZ`);
  }
}
