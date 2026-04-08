import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { Invitation, InvitationSchema } from './invitation.schema';
import { InvitationsRepository } from './invitations.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Invitation.name, schema: InvitationSchema },
    ]),
  ],
  providers: [InvitationsRepository],
  exports: [MongooseModule, InvitationsRepository],
})
export class InvitationsModule {}