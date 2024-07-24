import { Module } from '@nestjs/common';

import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { DataModule } from './data/data.module';
import { PlanModule } from './plan/plan.module';
import { PaymentModule } from './payment/payment.module';
import { BillingModule } from './billing/billing.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { v4 as uuidv4 } from 'uuid';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // LoggerModule.forRootAsync({
    //   imports: [ConfigModule],
    //   inject: [ConfigService],
    //   useFactory: async (configService: ConfigService) => {
    //     return {
    //       pinoHttp: {
    //         genReqId: true,
    //         transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
    //       },
    //     };
    //   },
    // }),
    AuthModule,
    UserModule,
    DataModule,
    PlanModule,
    PaymentModule,
    BillingModule,

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
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('DATABASE_URL'),
        dbName: configService.get<string>('DATABASE_NAME'),
        auth: {
          password: configService.get<string>('DATABASE_PASSWORD'),
          username: configService.get<string>('DATABASE_USERNAME'),
        },
      }),
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
