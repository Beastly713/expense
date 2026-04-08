import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Membership, MembershipSchema } from './membership.schema';
import { MembershipsRepository } from './memberships.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Membership.name, schema: MembershipSchema },
    ]),
  ],
  providers: [MembershipsRepository],
  exports: [MongooseModule, MembershipsRepository],
})
export class MembershipsModule {}