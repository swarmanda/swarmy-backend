import { BatchId, Bee, Data, FileData } from '@ethersphere/bee-js';
import { Injectable } from '@nestjs/common';
import { Readable } from 'stream';
import { ConfigService } from '@nestjs/config';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

@Injectable()
export class BeeService {
  private bee: Bee;

  constructor(
    @InjectPinoLogger(BeeService.name)
    private readonly logger: PinoLogger,
    configService: ConfigService,
  ) {
    this.bee = new Bee(configService.get<string>('BEE_URL'));
  }

  async download(hash: string): Promise<FileData<Data>> {
    return await this.bee.downloadFile(hash);
  }

  async upload(postageBatchId: string, data: Readable, fileName: string) {
    return await this.bee.uploadFile(postageBatchId, data, fileName);
  }

  async getAllPostageBatches() {
    return await this.bee.getAllPostageBatch();
  }

  async createPostageBatch(amount: string, depth: number): Promise<BatchId> {
    this.logger.info(`Creating postage batch with amount: ${amount}, depth: ${depth}`);
    return await this.bee.createPostageBatch(amount, depth, { waitForUsable: true, waitForUsableTimeout: 480_000 });
  }

  async dilute(postageBatchId: string, depth: number) {
    this.logger.info(`Performing dilute on ${postageBatchId} with depth: ${depth}`);
    return await this.bee.diluteBatch(postageBatchId, depth);
  }

  async topUp(postageBatchId: string, amount: string) {
    this.logger.info(`Performing topUp on ${postageBatchId} with amount: ${amount}`);
    return await this.bee.topUpBatch(postageBatchId, amount);
  }
}
