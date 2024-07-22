import { Injectable } from '@nestjs/common';
import { UploadResultDto } from './upload.result.dto';
import { InjectModel } from '@nestjs/mongoose';
import { User } from '../user/user.schema';
import { Model } from 'mongoose';
import { FileReference } from './file.schema';
import * as imageThumbnail from 'image-thumbnail';
import { Organization } from '../organization/organization.schema';

@Injectable()
export class FileReferenceService {
  constructor(
    @InjectModel(FileReference.name)
    private fileReferenceModel: Model<FileReference>,
  ) {}

  async createFileReference(
    hash: string,
    organization: Organization,
    file: Express.Multer.File,
    user?: User,
  ): Promise<UploadResultDto> {
    return await new this.fileReferenceModel({
      userId: user?._id,
      organizationId: organization._id,
      hash,
      size: file.size,
      name: file.originalname,
      contentType: file.mimetype.split(';')[0],
      thumbnailBase64: await this.createThumbnail(file),
    }).save();
  }

  async getFileReferences(organizationId: string): Promise<FileReference[]> {
    return (await this.fileReferenceModel.find({
      organizationId,
    })) as FileReference[];
  }

  async getFileReference(org: Organization, hash: string) {
    return (await this.fileReferenceModel.findOne({ organizationId: org._id, hash })) as FileReference;
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
