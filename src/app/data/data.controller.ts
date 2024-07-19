import { Controller, Get, Param, Post, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import { UploadResultDto } from './upload.result.dto';
import { UploadService } from './upload.service';
import { UserInContext } from '../user/user.decorator';
import { User } from '../user/user.schema';
import { FileReferenceService } from './file.service';
import { DownloadService } from './download.service';
import { Multer } from 'multer';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import { Public } from '../auth/public.decorator';
import { QuotaMetricsService } from './quota-metrics.service';
import { Response } from 'express';
import { Buffer } from 'safe-buffer';
import { OrganizationInContext } from '../organization/organization.decorator';
import { Organization } from '../organization/organization.schema';

@Controller()
export class DataController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly downloadService: DownloadService,
    private readonly fileReferenceService: FileReferenceService,
    private readonly quotaMetricsService: QuotaMetricsService,
  ) {}

  @Post('files')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @OrganizationInContext() org: Organization,
    @UserInContext() user: User,
    @UploadedFile() file: Express.Multer.File,
  ): UploadResultDto {
    return this.uploadService.uploadFile(org, file, user);
  }

  @Public()
  @UseGuards(ApiKeyGuard)
  @Post('api/files')
  @UseInterceptors(FileInterceptor('file'))
  uploadFileApi(
    @OrganizationInContext() org: Organization,
    @UploadedFile() file: Express.Multer.File,
  ): UploadResultDto {
    return this.uploadService.uploadFile(org, file);
  }

  @Public()
  @UseGuards(ApiKeyGuard)
  @Get('api/files/')
  async getFileList(@OrganizationInContext() org: Organization) {
    const result = await this.fileReferenceService.getFileReferences(org._id.toString());
    return result.map((f) => ({
      hash: f.hash,
      name: f.name,
      contentType: f.contentType,
      size: f.size,
      hits: f.hits,
      createdAt: f['createdAt']
    }));
  }

  @Public()
  @UseGuards(ApiKeyGuard)
  @Get('files/:hash')
  async downloadFile(@OrganizationInContext() org: Organization, @Param('hash') hash: string, @Res() response: Response) {
    try {
      const result = await this.downloadService.download(org, hash);
      return response.status(200).contentType(result.contentType).send(Buffer.from(result.data.buffer));
    } catch (error) {
      return response.status(404).json({ message: 'not found' });
    }
  }

  @Get('file-references')
  getFileReferencesForUser(@UserInContext() user: User) {
    return this.fileReferenceService.getFileReferences(user.organizationId);
  }

  @Get('quota-metrics')
  getQuotaMetricsForOrganization(@UserInContext() user: User) {
    return this.quotaMetricsService.getForOrganization(user.organizationId);
  }
}
