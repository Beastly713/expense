import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ActivityModule } from '../activity/activity.module';
import { AuthModule } from '../auth/auth.module';
import { ExpensesModule } from '../expenses/expenses.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { SettlementsModule } from '../settlements/settlements.module';
import { UsersModule } from '../users/users.module';
import { Group, GroupSchema } from './group.schema';
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
  ],
  controllers: [GroupsController],
  providers: [GroupsRepository, GroupsService],
  exports: [MongooseModule, GroupsRepository, GroupsService],
})
export class GroupsModule {}