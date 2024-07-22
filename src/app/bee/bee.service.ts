import { BatchId, Bee, Data, FileData } from '@ethersphere/bee-js';
import { Injectable } from '@nestjs/common';
import { Readable } from 'stream';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BeeService {
  private bee: Bee;

  constructor(configService: ConfigService) {
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
    return await this.bee.createPostageBatch(amount, depth);
  }
}
