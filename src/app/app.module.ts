import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';
import { v4 as uuidv4 } from 'uuid';
import { AuthModule } from './auth/auth.module';
import { BillingModule } from './billing/billing.module';
import { DataModule } from './data/data.module';
import { EmailModule } from './email/email.module';
import { HealthcheckModule } from './healthcheck/healthcheck.module';
import { MonitorModule } from './monitor/monitor.module';
import { PaymentModule } from './payment/payment.module';
import { PlanModule } from './plan/plan.module';
import { StaticTextModule } from './static-text/static-text.module';
import { UserModule } from './user/user.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    AuthModule,
    UserModule,
    DataModule,
    PlanModule,
    PaymentModule,
    BillingModule,
    HealthcheckModule,
    StaticTextModule,
    EmailModule,
    MonitorModule,

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
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
