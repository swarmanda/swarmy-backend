import { BadRequestException, Body, Controller, HttpCode, Post, RawBodyRequest, Req } from '@nestjs/common';
import { Request } from 'express';
import { OrganizationsRow, UsersRow } from 'src/DatabaseExtra';
import { Public } from '../auth/public.decorator';
import { OrganizationInContext } from '../organization/organization.decorator';
import { UserInContext } from '../user/user.decorator';
import { BillingService } from './billing.service';
import { StartSubscriptionDto } from './start-subscription.dto';

@Controller()
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Public()
  @Post('payment/stripe-notification')
  handleStripeNotification(@Body() notification: any, @Req() request: RawBodyRequest<Request>) {
    const signature = request.headers['stripe-signature'];
    if (typeof signature !== 'string') {
      throw new BadRequestException('signature has invalid format');
    }

    if (!request.rawBody) {
      throw new BadRequestException('request body is empty');
    }
    return this.billingService.handleStripeNotification(request.rawBody, signature);
  }

  @Post('subscriptions/init')
  startSubscriptionToPlan(@UserInContext() user: UsersRow, @Body() payload: StartSubscriptionDto) {
    return this.billingService.initSubscriptionProcess(user, payload);
  }

  @Post('subscriptions/cancel')
  @HttpCode(200)
  cancelPlan(@OrganizationInContext() organization: OrganizationsRow) {
    return this.billingService.cancelPlan(organization);
  }
}
