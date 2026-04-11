import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ActivityModule } from '../activity/activity.module';
import { AuthModule } from '../auth/auth.module';
import { GroupsModule } from '../groups/groups.module';
import { MembershipsModule } from '../memberships/memberships.module';
import { UsersModule } from '../users/users.module';
import { Invitation, InvitationSchema } from './invitation.schema';
import { InviteAcceptanceController } from './invite-acceptance.controller';
import { InvitationsController } from './invitations.controller';
import { InvitationsEmailService } from './invitations-email.service';
import { InvitationsRepository } from './invitations.repository';
import { InvitationsService } from './invitations.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Invitation.name, schema: InvitationSchema },
    ]),
    AuthModule,
    GroupsModule,
    MembershipsModule,
    ActivityModule,
    UsersModule,
  ],
  controllers: [InvitationsController, InviteAcceptanceController],
  providers: [
    InvitationsRepository,
    InvitationsEmailService,
    InvitationsService,
  ],
  exports: [
    MongooseModule,
    InvitationsRepository,
    InvitationsEmailService,
    InvitationsService,
  ],
})
export class InvitationsModule {}