import { BatchId, Bee, BeeModes, Data, FileData } from '@ethersphere/bee-js';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Types } from 'cafe-utility';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Readable } from 'stream';
import { BZZ } from '../token/bzz';

@Injectable()
export class BeeService {
  private bee: Bee;

  constructor(
    @InjectPinoLogger(BeeService.name)
    private readonly logger: PinoLogger,
    configService: ConfigService,
  ) {
    this.bee = new Bee(Types.asString(configService.get<string>('BEE_URL'), { name: 'BEE_URL' }));
  }

  async download(hash: string, path?: string): Promise<FileData<Data>> {
    return await this.bee.downloadFile(hash, path);
  }

  async upload(postageBatchId: string, data: Readable, fileName: string, uploadAsWebsite?: boolean) {
    const requestOptions = uploadAsWebsite
      ? {
          headers: {
            'Swarm-Index-Document': 'index.html',
            'Swarm-Collection': 'true',
          },
        }
      : undefined;
    const options = uploadAsWebsite ? { contentType: 'application/x-tar' } : undefined;
    return await this.bee.uploadFile(postageBatchId, data, fileName, options, requestOptions);
  }

  async getAllPostageBatches() {
    return await this.bee.getAllPostageBatch();
  }

  async getWallet() {
    return await this.bee.getWalletBalance();
  }

  async getWalletBzzBalance() {
    if (await this.isDev()) {
      return 99999999;
    }
    const wallet = await this.getWallet();
    return new BZZ(wallet.bzzBalance).toBZZ(2);
  }

  async getPostageBatch(postageBatchId: string) {
    return await this.bee.getPostageBatch(postageBatchId);
  }

  async createPostageBatch(amount: string, depth: number): Promise<BatchId> {
    return await this.bee.createPostageBatch(amount, depth, { waitForUsable: true, waitForUsableTimeout: 480_000 });
  }

  async dilute(postageBatchId: string, depth: number) {
    this.logger.info(`Performing dilute on ${postageBatchId} with depth: ${depth}`);
    if (await this.isDev()) {
      this.logger.info(`Skipping dilute because bee is running in dev mode`);
    } else {
      return await this.bee.diluteBatch(postageBatchId, depth);
    }
  }

  async topUp(postageBatchId: string, amount: string) {
    if (await this.isDev()) {
      this.logger.info(`Skipping topUp because bee is running in dev mode`);
    } else {
      return await this.bee.topUpBatch(postageBatchId, amount);
    }
  }

  async isDev() {
    const info = await this.bee.getNodeInfo();
    return info.beeMode === BeeModes.DEV;
  }
}
