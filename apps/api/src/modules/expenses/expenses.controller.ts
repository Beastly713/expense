import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AccessTokenGuard } from '../../common/guards/access-token.guard';
import type { AuthenticatedRequestUser } from '../../common/types/authenticated-request-user';
import { UpdateExpenseDto } from './dto/update-expense.dto';
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

  @Patch(':expenseId')
  updateExpense(
    @Param('expenseId') expenseId: string,
    @Body() dto: UpdateExpenseDto,
    @CurrentUser() currentUser: AuthenticatedRequestUser,
  ) {
    return this.expensesService.updateExpense(
      expenseId,
      dto,
      currentUser.userId,
    );
  }
}