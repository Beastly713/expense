import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import type { AuthenticatedRequestUser } from '../../common/types/authenticated-request-user';
import { ExpensesService } from './expenses.service';

@ApiTags('expenses')
@ApiBearerAuth()
@UseGuards(AccessTokenGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get(':expenseId')
  getExpenseDetails(
    @Param('expenseId') expenseId: string,
    @CurrentUser() currentUser: AuthenticatedRequestUser,
  ) {
    return this.expensesService.getExpenseDetails(
      expenseId,
      currentUser.userId,
    );
  }
}