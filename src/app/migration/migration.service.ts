import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from '../user/user.schema';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { ApiKey } from '../api-key/api-key.schema';
import { FileReference } from '../data/file.schema';
import { Organization } from '../organization/organization.schema';
import { PaymentNotification } from '../payment/payment-notification.schema';
import { Payment } from '../payment/payment.schema';
import { Plan } from '../plan/plan.schema';
import { StaticText } from '../static-text/static-text.schema';
import { UsageMetrics } from '../data/usage-metrics.schema';

@Injectable()
export class MigrationService {
  private readonly frontendUrl: string;

  constructor(
    // configService: ConfigService,
    @InjectPinoLogger(MigrationService.name)
    private readonly logger: PinoLogger,
    @InjectModel(Organization.name, 'OLD_DB_CONNECTION') private oldOrgModel: Model<Organization>,
    @InjectModel(Organization.name, 'NEW_DB_CONNECTION') private newOrgModel: Model<Organization>,
    @InjectModel(User.name, 'OLD_DB_CONNECTION') private oldUserModel: Model<User>,
    @InjectModel(User.name, 'NEW_DB_CONNECTION') private newUserModel: Model<User>,
    @InjectModel(ApiKey.name, 'OLD_DB_CONNECTION') private oldApiKeyModel: Model<ApiKey>,
    @InjectModel(ApiKey.name, 'NEW_DB_CONNECTION') private newApiKeyModel: Model<ApiKey>,
    @InjectModel(FileReference.name, 'OLD_DB_CONNECTION') private oldFileRefModel: Model<FileReference>,
    @InjectModel(FileReference.name, 'NEW_DB_CONNECTION') private newFileRefModel: Model<FileReference>,
    @InjectModel(Payment.name, 'OLD_DB_CONNECTION') private oldPaymentModel: Model<Payment>,
    @InjectModel(Payment.name, 'NEW_DB_CONNECTION') private newPaymentModel: Model<Payment>,
    @InjectModel(PaymentNotification.name, 'OLD_DB_CONNECTION') private oldPaymentNotiModel: Model<PaymentNotification>,
    @InjectModel(PaymentNotification.name, 'NEW_DB_CONNECTION') private newPaymentNotiModel: Model<PaymentNotification>,
    @InjectModel(Plan.name, 'OLD_DB_CONNECTION') private oldPlanModel: Model<Plan>,
    @InjectModel(Plan.name, 'NEW_DB_CONNECTION') private newPlanModel: Model<Plan>,
    @InjectModel(UsageMetrics.name, 'OLD_DB_CONNECTION') private oldUsageMetricsModel: Model<UsageMetrics>,
    @InjectModel(UsageMetrics.name, 'NEW_DB_CONNECTION') private newUsageMetricsModel: Model<UsageMetrics>,
    @InjectModel(StaticText.name, 'OLD_DB_CONNECTION') private oldStaticTextModel: Model<StaticText>,
    @InjectModel(StaticText.name, 'NEW_DB_CONNECTION') private newStaticTextModel: Model<StaticText>,
  ) {}

  async start() {
    this.logger.info(`Migration start`);
    await this.migrate('organization', this.oldOrgModel, this.newOrgModel);
    await this.migrate('user', this.oldUserModel, this.newUserModel);
    await this.migrate('apiKey', this.oldApiKeyModel, this.newApiKeyModel);
    await this.migrate('fileReference', this.oldFileRefModel, this.newFileRefModel);
    await this.migrate('payment', this.oldPaymentModel, this.newPaymentModel);
    await this.migrate('paymentNotification', this.oldPaymentNotiModel, this.newPaymentNotiModel);
    await this.migrate('plan', this.oldPlanModel, this.newPlanModel);
    await this.migrate('staticText', this.oldStaticTextModel, this.newStaticTextModel);
    await this.migrate('usageMetrics', this.oldUsageMetricsModel, this.newUsageMetricsModel);
  }

  private async migrate(modelName: string, oldModel: Model<any>, newModel: Model<any>) {
    const oldRecords = await oldModel.find();

    this.logger.info(`Removing all ${modelName} records from NEW_DB`);
    await newModel.deleteMany();
    this.logger.info(`Migrating ${oldRecords.length} ${modelName}`);
    await newModel.insertMany(oldRecords);
    const newRecords = await newModel.find();
    this.logger.info(`Migrated ${newRecords.length} ${modelName}`);
  }
}
