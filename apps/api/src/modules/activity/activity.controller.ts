import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import type { AuthenticatedRequestUser } from '../../common/types/authenticated-request-user';
import { ActivityService } from './activity.service';
import { ListActivityDto } from './dto/list-activity.dto';

@ApiTags('activity')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Get()
  getGlobalActivity(
    @Query() query: ListActivityDto,
    @CurrentUser() currentUser: AuthenticatedRequestUser,
  ) {
    return this.activityService.getGlobalActivity(currentUser.userId, query);
  }
}