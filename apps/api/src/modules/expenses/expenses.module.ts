import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Expense, ExpenseSchema } from './expense.schema';
import { Split, SplitSchema } from './split.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Expense.name, schema: ExpenseSchema },
      { name: Split.name, schema: SplitSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class ExpensesModule {}