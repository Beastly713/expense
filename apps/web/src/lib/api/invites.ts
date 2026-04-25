import type { GroupType } from '@splitwise/shared-types';

import { apiRequest } from './client';

export interface CreateGroupInvitesInput {
  emails: string[];
}

export interface InviteItem {
  invitationId: string;
  email: string;
  status: 'pending' | 'accepted' | 'cancelled' | 'expired';
  membershipId?: string;
  invitedAt?: string;
}

export interface ReceivedPendingInvite {
  invitationId: string;
  email: string;
  status: 'pending';
  membershipId: string | null;
  invitedAt: string;
  expiresAt: string | null;
  group: {
    id: string;
    name: string;
    type: GroupType;
    defaultCurrency: string;
  };
}

export interface CreateInvitesResponse {
  invites: Array<{
    invitationId: string;
    email: string;
    status: 'pending' | 'accepted' | 'cancelled' | 'expired';
    membershipId: string;
  }>;
}

export interface ListInvitesResponse {
  invites: InviteItem[];
}

export interface ListReceivedPendingInvitesResponse {
  invites: ReceivedPendingInvite[];
}

export interface InviteMessageResponse {
  message: string;
}

export interface AcceptInviteResponse {
  group: {
    id: string;
    name: string;
  };
  membership: {
    membershipId: string;
    status: 'active' | 'pending' | 'removed';
  };
}

export function createGroupInvites(
  groupId: string,
  input: CreateGroupInvitesInput,
  accessToken: string,
) {
  return apiRequest<CreateInvitesResponse>(`/groups/${groupId}/invites`, {
    method: 'POST',
    body: {
      emails: input.emails.map((email) => email.trim().toLowerCase()),
    },
    accessToken,
  });
}

export function listGroupInvites(groupId: string, accessToken: string) {
  return apiRequest<ListInvitesResponse>(`/groups/${groupId}/invites`, {
    method: 'GET',
    accessToken,
  });
}

export function listReceivedPendingInvites(accessToken: string) {
  return apiRequest<ListReceivedPendingInvitesResponse>('/invites/pending', {
    method: 'GET',
    accessToken,
  });
}

export function resendGroupInvite(
  groupId: string,
  invitationId: string,
  accessToken: string,
) {
  return apiRequest<InviteMessageResponse>(
    `/groups/${groupId}/invites/${invitationId}/resend`,
    {
      method: 'POST',
      accessToken,
    },
  );
}

export function cancelGroupInvite(
  groupId: string,
  invitationId: string,
  accessToken: string,
) {
  return apiRequest<InviteMessageResponse>(
    `/groups/${groupId}/invites/${invitationId}`,
    {
      method: 'DELETE',
      accessToken,
    },
  );
}

export function acceptInvite(token: string, accessToken: string) {
  return apiRequest<AcceptInviteResponse>(`/invites/${token}/accept`, {
    method: 'POST',
    accessToken,
  });
}

export function acceptPendingInvite(
  invitationId: string,
  accessToken: string,
) {
  return apiRequest<AcceptInviteResponse>(
    `/invites/pending/${invitationId}/accept`,
    {
      method: 'POST',
      accessToken,
    },
  );
}