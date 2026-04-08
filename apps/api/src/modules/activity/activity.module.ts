import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ActivityLog, ActivityLogSchema } from './activity-log.schema';
import { ActivityRepository } from './activity.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ActivityLog.name, schema: ActivityLogSchema },
    ]),
  ],
  providers: [ActivityRepository],
  exports: [MongooseModule, ActivityRepository],
})
export class ActivityModule {}