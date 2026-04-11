import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import type { AuthenticatedRequestUser } from '../../common/types/authenticated-request-user';
import { CreateGroupExpenseDto } from '../expenses/dto/create-group-expense.dto';
import { CreateGroupDto } from './dto/create-group.dto';
import { ListGroupsDto } from './dto/list-groups.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupsService } from './groups.service';

@ApiTags('groups')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  createGroup(
    @Body() dto: CreateGroupDto,
    @CurrentUser() currentUser: AuthenticatedRequestUser,
  ) {
    return this.groupsService.createGroup(dto, currentUser.userId);
  }

  @Get()
  listGroups(
    @Query() query: ListGroupsDto,
    @CurrentUser() currentUser: AuthenticatedRequestUser,
  ) {
    return this.groupsService.listGroups(query, currentUser.userId);
  }

  @Get(':groupId')
  getGroupDetails(
    @Param('groupId') groupId: string,
    @CurrentUser() currentUser: AuthenticatedRequestUser,
  ) {
    return this.groupsService.getGroupDetails(groupId, currentUser.userId);
  }

  @Get(':groupId/members')
  listGroupMembers(
    @Param('groupId') groupId: string,
    @CurrentUser() currentUser: AuthenticatedRequestUser,
  ) {
    return this.groupsService.listGroupMembers(groupId, currentUser.userId);
  }

  @Post(':groupId/expenses')
  createExpense(
    @Param('groupId') groupId: string,
    @Body() dto: CreateGroupExpenseDto,
    @CurrentUser() currentUser: AuthenticatedRequestUser,
  ) {
    return this.groupsService.createExpense(groupId, dto, currentUser.userId);
  }

  @Patch(':groupId')
  updateGroup(
    @Param('groupId') groupId: string,
    @Body() dto: UpdateGroupDto,
    @CurrentUser() currentUser: AuthenticatedRequestUser,
  ) {
    return this.groupsService.updateGroup(groupId, dto, currentUser.userId);
  }
}