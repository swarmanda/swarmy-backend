import { BadRequestException, Body, Controller, HttpCode, Post, RawBodyRequest, Req } from '@nestjs/common';
import { BillingService } from './billing.service';
import { Public } from '../auth/public.decorator';
import { UserInContext } from '../user/user.decorator';
import { User } from '../user/user.schema';
import { Request } from 'express';
import { StartSubscriptionDto } from './start-subscription.dto';
import { OrganizationInContext } from '../organization/organization.decorator';
import { Organization } from '../organization/organization.schema';

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

    return this.billingService.handleStripeNotification(request.rawBody, signature);
  }

  @Post('subscriptions/init')
  startSubscriptionToPlan(@UserInContext() user: User, @Body() payload: StartSubscriptionDto) {
    return this.billingService.initSubscriptionProcess(user, payload);
  }

  @Post('subscriptions/cancel')
  @HttpCode(200)
  cancelPlan(@OrganizationInContext() org: Organization) {
    return this.billingService.cancelPlan(org);
  }
}
