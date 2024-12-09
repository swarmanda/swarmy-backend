import { Controller, Get } from '@nestjs/common';
import { UsersRow } from 'src/DatabaseExtra';
import { Public } from '../auth/public.decorator';
import { UserInContext } from '../user/user.decorator';
import { PlanService } from './plan.service';
import { subscriptionConfig } from './subscriptions';

@Controller('plans')
export class PlanController {
  constructor(private readonly planService: PlanService) {}

  @Public()
  @Get('/config')
  getSubscriptionConfig() {
    return subscriptionConfig;
  }

  @Get('/active')
  async getPlan(@UserInContext() user: UsersRow) {
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
