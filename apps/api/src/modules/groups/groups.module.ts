import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Group, GroupSchema } from './group.schema';
import { GroupsRepository } from './groups.repository';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Group.name, schema: GroupSchema }]),
  ],
  providers: [GroupsRepository],
  exports: [MongooseModule, GroupsRepository],
})
export class GroupsModule {}