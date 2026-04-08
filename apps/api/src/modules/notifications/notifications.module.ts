import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Notification, NotificationSchema } from './notification.schema';
import { NotificationsRepository } from './notifications.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
    ]),
  ],
  providers: [NotificationsRepository],
  exports: [MongooseModule, NotificationsRepository],
})
export class NotificationsModule {}