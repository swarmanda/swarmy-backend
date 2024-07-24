import { Controller, Get, Post } from '@nestjs/common';
import { PlanService } from './plan.service';
import { Public } from '../auth/public.decorator';
import { UserInContext } from '../user/user.decorator';
import { User } from '../user/user.schema';
import { subscriptionConfig } from './subscription.constants';

@Controller('plans')
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Public()
  @Get('/config')
  getSubscriptionConfig() {
    return subscriptionConfig;
  }

  @Get('/active')
  async getPlan(@UserInContext() user: User) {
    const result = await this.planService.getActivePlanForOrganization(user.organizationId);
    return (
      result || {
        type: 'FREE_PLAN',
        organizationId: user.organizationId,
        amount: 0,
        currency: subscriptionConfig.currency,
        quotas: {
          uploadSizeLimit: 0,
          downloadSizeLimit: 0,
          downloadCountLimit: 0,
          uploadCountLimit: 0,
        },
      }
    );
  }
}
