import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Invitation, InvitationSchema } from './invitation.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Invitation.name, schema: InvitationSchema },
    ]),
  ],
  exports: [MongooseModule],
})
export class InvitationsModule {}