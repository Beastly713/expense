import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from '../auth/auth.module';
import { Group, GroupSchema } from '../groups/group.schema';
import { MembershipsModule } from '../memberships/memberships.module';
import { ActivityController } from './activity.controller';
import { ActivityLog, ActivityLogSchema } from './activity-log.schema';
import { ActivityRepository } from './activity.repository';
import { ActivityService } from './activity.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ActivityLog.name, schema: ActivityLogSchema },
      { name: Group.name, schema: GroupSchema },
    ]),
    AuthModule,
    MembershipsModule,
  ],
  controllers: [ActivityController],
  providers: [ActivityRepository, ActivityService],
  exports: [MongooseModule, ActivityRepository, ActivityService],
})
export class ActivityModule {}