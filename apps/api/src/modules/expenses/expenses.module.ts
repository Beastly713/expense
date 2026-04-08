import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Expense, ExpenseSchema } from './expense.schema';
import { ExpensesRepository } from './expenses.repository';
import { Split, SplitSchema } from './split.schema';
import { SplitsRepository } from './splits.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Expense.name, schema: ExpenseSchema },
      { name: Split.name, schema: SplitSchema },
    ]),
  ],
  providers: [ExpensesRepository, SplitsRepository],
  exports: [MongooseModule, ExpensesRepository, SplitsRepository],
})
export class ExpensesModule {}