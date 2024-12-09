import {
  Body,
  Controller,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { Buffer } from 'safe-buffer';
import { OrganizationsRow, UsersRow } from 'src/DatabaseExtra';
import { ApiKeyGuard } from '../api-key/api-key.guard';
import { Public } from '../auth/public.decorator';
import { OrganizationInContext } from '../organization/organization.decorator';
import { UserInContext } from '../user/user.decorator';
import { DownloadService } from './download.service';
import { FileReferenceService } from './file.service';
import { UploadResultDto } from './upload.result.dto';
import { UploadService } from './upload.service';
import { UsageMetricsService } from './usage-metrics.service';

const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1gb

@Controller()
export class DataController {
  constructor(
    private readonly uploadService: UploadService,
    private readonly downloadService: DownloadService,
    private readonly fileReferenceService: FileReferenceService,
    private readonly usageMetricsService: UsageMetricsService,
  ) {}

  @Post('files')
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @OrganizationInContext() organization: OrganizationsRow,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE })],
      }),
    )
    file: Express.Multer.File,
    @Body() body: any,
  ): UploadResultDto {
    return this.uploadService.uploadFile(organization, file, body.website);
  }

  @Public()
  @UseGuards(ApiKeyGuard)
  @Post('api/files')
  @UseInterceptors(FileInterceptor('file'))
  uploadFileApi(
    @OrganizationInContext() organization: OrganizationsRow,
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: MAX_FILE_SIZE })],
      }),
    )
    file: Express.Multer.File,
    @Query('website') website: boolean,
  ): UploadResultDto {
    return this.uploadService.uploadFile(organization, file, website);
  }

  @Public()
  @UseGuards(ApiKeyGuard)
  @Get('api/files')
  async getFileList(@OrganizationInContext() organization: OrganizationsRow) {
    const result = await this.fileReferenceService.getFileReferences(organization.id);
    return result.map((f) => ({
      hash: f.hash,
      name: f.name,
      contentType: f.contentType,
      size: f.size,
      hits: f.hits,
      createdAt: f['createdAt'],
    }));
  }

  @Public()
  @UseGuards(ApiKeyGuard)
  @Get('files/:hash')
  async downloadFile(
    @OrganizationInContext() organization: OrganizationsRow,
    @Param('hash') hash: string,
    @Res() response: Response,
    @Req() request: Request,
  ) {
    const result = await this.downloadService.download(organization, hash);
    for (const key in result.headers) {
      response.header(key, result.headers[key]);
    }
    // todo maybe add cookie only for sites
    return response.status(200).cookie('k', request['key']).send(Buffer.from(result.data.buffer));
  }

  @Public()
  @UseGuards(ApiKeyGuard)
  @Get('files/:hash/*')
  async downloadEmbeddedFile(
    @OrganizationInContext() organization: OrganizationsRow,
    @Param('hash') hash: string,
    @Res() response: Response,
    @Req() request: Request,
  ) {
    try {
      const path = request.path.split(hash)[1];
      const result = await this.downloadService.download(organization, hash, path);
      for (const key in result.headers) {
        response.header(key, result.headers[key]);
      }
      return response.status(200).send(Buffer.from(result.data.buffer));
    } catch (error) {
      return response.status(404).json({ message: 'not found' });
    }
  }

  @Get('file-references')
  getFileReferencesForUser(@UserInContext() user: UsersRow) {
    return this.fileReferenceService.getFileReferences(user.organizationId);
  }

  @Get('usage-metrics')
  getUsageMetricsForOrganization(@UserInContext() user: UsersRow) {
    return this.usageMetricsService.getAllForOrganization(user.organizationId);
  }
}
