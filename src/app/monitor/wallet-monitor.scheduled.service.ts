import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Interval } from '@nestjs/schedule';
import { BeeService } from '../bee/bee.service';

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
    const bzzBalanceTimes100 = BigInt(wallet.bzzBalance) / 100000000000000n;
    const bzzBalance = (Number(bzzBalanceTimes100) / 100).toFixed(2);
    this.logger.info(`Wallet Monitor - balance is ${bzzBalance} BZZ`);
  }
}
