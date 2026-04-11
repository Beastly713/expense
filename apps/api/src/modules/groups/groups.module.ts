import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ActivityModule } from '../activity/activity.module';
import { AuthModule } from '../auth/auth.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SettlementsModule } from '../settlements/settlements.module';
import { UsersModule } from '../users/users.module';
import { Group, GroupSchema } from './group.schema';
import { GroupBalanceService } from './group-balance.service';
import { GroupsController } from './groups.controller';
import { GroupsRepository } from './groups.repository';
import { GroupsService } from './groups.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Group.name, schema: GroupSchema }]),
    AuthModule,
    UsersModule,
    MembershipsModule,
    ActivityModule,
    ExpensesModule,
    SettlementsModule,
    NotificationsModule,
  ],
  controllers: [GroupsController],
  providers: [GroupsRepository, GroupBalanceService, GroupsService],
  exports: [MongooseModule, GroupsRepository, GroupBalanceService, GroupsService],
})
export class GroupsModule {}