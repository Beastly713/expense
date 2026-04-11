import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { Expense, ExpenseSchema } from './expense.schema';
import { ExpensesController } from './expenses.controller';
import { ExpensesRepository } from './expenses.repository';
import { ExpensesService } from './expenses.service';
import { Split, SplitSchema } from './split.schema';
import { SplitsRepository } from './splits.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Expense.name, schema: ExpenseSchema },
      { name: Split.name, schema: SplitSchema },
    ]),
    AuthModule,
    MembershipsModule,
  ],
  controllers: [ExpensesController],
  providers: [ExpensesRepository, SplitsRepository, ExpensesService],
  exports: [
    MongooseModule,
    ExpensesRepository,
    SplitsRepository,
    ExpensesService,
  ],
})
export class ExpensesModule {}