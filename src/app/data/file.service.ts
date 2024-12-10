import { Injectable } from '@nestjs/common';
import * as imageThumbnail from 'image-thumbnail';
import {
  FileReferencesRow,
  getFileReferencesRows,
  getOnlyFileReferencesRowOrThrow,
  insertFileReferencesRow,
  OrganizationsRow,
  OrganizationsRowId,
} from 'src/DatabaseExtra';
import { UploadResultDto } from './upload.result.dto';

@Injectable()
export class FileReferenceService {
  constructor() {}

  async createFileReference(
    hash: string,
    organization: OrganizationsRow,
    file: Express.Multer.File,
    isWebsite: boolean,
  ): Promise<UploadResultDto> {
    const id = await insertFileReferencesRow({
      organizationId: organization.id,
      hash,
      size: file.size,
      name: file.originalname,
      contentType: file.mimetype.split(';')[0],
      thumbnailBase64: await this.createThumbnail(file),
      isWebsite: isWebsite ? 1 : 0,
    });
    return getOnlyFileReferencesRowOrThrow({ id });
  }

  async getFileReferences(organizationId: OrganizationsRowId): Promise<FileReferencesRow[]> {
    return getFileReferencesRows({ organizationId }, { order: { column: 'id', direction: 'DESC' } });
  }

  async getFileReference(organization: OrganizationsRow, hash: string) {
    return getOnlyFileReferencesRowOrThrow({ organizationId: organization.id, hash });
  }

  private isImage(mimetype: string) {
    return ['image/png', 'image/jpeg', 'image/webp'].includes(mimetype);
  }

  private async createThumbnail(file: Express.Multer.File): Promise<string | null> {
    if (this.isImage(file.mimetype)) {
      return await imageThumbnail(Buffer.from(file.buffer), {
        width: 100,
        height: 100,
        responseType: 'base64',
      });
    }
    return null;
  }
}
