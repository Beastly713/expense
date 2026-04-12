import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ActivityModule } from '../activity/activity.module';
import { AuthModule } from '../auth/auth.module';
import { GroupsModule } from '../groups/groups.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';
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
    UsersModule,
    ActivityModule,
    NotificationsModule,
    forwardRef(() => GroupsModule),
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