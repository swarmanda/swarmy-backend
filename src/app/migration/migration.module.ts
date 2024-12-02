import { Module } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { v4 as uuidv4 } from 'uuid';
import { MigrationService } from './migration.service';
import { User, UserSchema } from '../user/user.schema';
import { MigrationController } from './migration.controller';
import { Organization, OrganizationSchema } from '../organization/organization.schema';
import { ApiKey, ApiKeySchema } from '../api-key/api-key.schema';
import { FileReference, FileReferenceSchema } from '../data/file.schema';
import { Payment, PaymentSchema } from '../payment/payment.schema';
import { PaymentNotification, PaymentNotificationSchema } from '../payment/payment-notification.schema';
import { Plan, PlanSchema } from '../plan/plan.schema';
import { StaticText, StaticTextSchema } from '../static-text/static-text.schema';
import { UsageMetrics, UsageMetricsSchema } from '../data/usage-metrics.schema';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const isDev = configService.get<string>('ENV') === 'dev';
        return {
          pinoHttp: {
            level: 'debug',
            autoLogging: false,
            transport: isDev
              ? {
                  target: 'pino-pretty',
                  options: {
                    singleLine: true,
                    ignore: 'pid,hostname,req.headers,req.method,req.query,req.params,req.remoteAddress,req.remotePort',
                  },
                }
              : undefined,
            // quietReqLogger: true,
            genReqId: function (req, res) {
              const existingID = req.id ?? req.headers['x-request-id'];
              if (existingID) return existingID;
              const id = uuidv4();
              res.setHeader('X-Request-Id', id);
              return id;
            },
          },
        };
      },
    }),

    MongooseModule.forRootAsync({
      connectionName: 'OLD_DB_CONNECTION',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MIGRATION_OLD_DATABASE_URL'),
        dbName: configService.get<string>('MIGRATION_OLD_DATABASE_NAME'),
        auth: {
          password: configService.get<string>('MIGRATION_OLD_DATABASE_PASSWORD'),
          username: configService.get<string>('MIGRATION_OLD_DATABASE_USERNAME'),
        },
      }),
    }),

    MongooseModule.forRootAsync({
      connectionName: 'NEW_DB_CONNECTION',
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MIGRATION_NEW_DATABASE_URL'),
        dbName: configService.get<string>('MIGRATION_NEW_DATABASE_NAME'),
        auth: {
          password: configService.get<string>('MIGRATION_NEW_DATABASE_PASSWORD'),
          username: configService.get<string>('MIGRATION_NEW_DATABASE_USERNAME'),
        },
      }),
    }),

    MongooseModule.forFeature(
      [
        { name: User.name, schema: UserSchema },
        { name: Organization.name, schema: OrganizationSchema },
        { name: ApiKey.name, schema: ApiKeySchema },
        { name: FileReference.name, schema: FileReferenceSchema },
        { name: Payment.name, schema: PaymentSchema },
        { name: PaymentNotification.name, schema: PaymentNotificationSchema },
        { name: Plan.name, schema: PlanSchema },
        { name: StaticText.name, schema: StaticTextSchema },
        { name: UsageMetrics.name, schema: UsageMetricsSchema },
      ],
      'NEW_DB_CONNECTION',
    ),

    MongooseModule.forFeature(
      [
        { name: User.name, schema: UserSchema },
        { name: Organization.name, schema: OrganizationSchema },
        { name: ApiKey.name, schema: ApiKeySchema },
        { name: FileReference.name, schema: FileReferenceSchema },
        { name: Payment.name, schema: PaymentSchema },
        { name: PaymentNotification.name, schema: PaymentNotificationSchema },
        { name: Plan.name, schema: PlanSchema },
        { name: StaticText.name, schema: StaticTextSchema },
        { name: UsageMetrics.name, schema: UsageMetricsSchema },
      ],
      'OLD_DB_CONNECTION',
    ),
  ],

  controllers: [MigrationController],
  providers: [MigrationService],
})
export class MigrationModule {}
