import { Body, Controller, Delete, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { CurrentUser, type AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { SubscribePushDto } from './dto/subscribe-push.dto';
import { PushService } from './push.service';

@Controller('me/push-subscriptions')
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Post()
  @HttpCode(HttpStatus.NO_CONTENT)
  subscribe(@CurrentUser() user: AuthenticatedUser, @Body() dto: SubscribePushDto) {
    return this.pushService.subscribe(user.userId, dto);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  unsubscribe(@Query('endpoint') endpoint: string) {
    return this.pushService.unsubscribe(endpoint);
  }
}
