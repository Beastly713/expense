import type {
  GroupType,
  MembershipStatus,
} from '@splitwise/shared-types';

import { apiRequest } from './client';

export interface CreateGroupInput {
  name: string;
  defaultCurrency: string;
  type?: GroupType;
}

export interface CreateDirectGroupInput {
  email: string;
}

export interface UpdateGroupInput {
  name?: string;
  defaultCurrency?: string;
}

export interface GroupListItem {
  id: string;
  name: string;
  type: GroupType;
  defaultCurrency: string;
  memberCount: number;
  youOweMinor: number;
  youAreOwedMinor: number;
  netBalanceMinor: number;
  lastActivityAt: string;
}

export interface ListGroupsResponse {
  groups: GroupListItem[];
}

export interface CreatedGroup {
  id: string;
  name: string;
  type: GroupType;
  defaultCurrency: string;
  createdByUserId: string;
  createdAt: string;
}

export interface CreateGroupResponse {
  group: CreatedGroup;
}

export interface CreateDirectGroupResponse {
  group: CreatedGroup;
}

export interface GroupMember {
  membershipId: string;
  userId: string | null;
  name: string;
  email: string;
  status: MembershipStatus;
  cachedNetBalanceMinor: number;
}

export interface SimplifiedBalance {
  fromMembershipId: string;
  toMembershipId: string;
  amountMinor: number;
}

export interface MemberNetBalance {
  membershipId: string;
  netBalanceMinor: number;
}

export interface GroupBalancesResponse {
  memberNetBalances: MemberNetBalance[];
  simplifiedBalances: SimplifiedBalance[];
}

export interface ListGroupMembersResponse {
  members: GroupMember[];
}

export interface GroupDetailsResponse {
  group: {
    id: string;
    name: string;
    type: GroupType;
    defaultCurrency: string;
    simplifyDebts: boolean;
  };
  members: GroupMember[];
  simplifiedBalances: SimplifiedBalance[];
  expenseCount: number;
}

export interface UpdateGroupResponse {
  group: {
    id: string;
    name: string;
    defaultCurrency: string;
  };
}

export interface ListGroupsParams {
  type?: GroupType | 'all';
}

function buildGroupsQuery(params?: ListGroupsParams): string {
  const searchParams = new URLSearchParams();

  if (params?.type) {
    searchParams.set('type', params.type);
  }

  const query = searchParams.toString();
  return query.length > 0 ? `?${query}` : '';
}

export function createGroup(input: CreateGroupInput, accessToken: string) {
  return apiRequest<CreateGroupResponse>('/groups', {
    method: 'POST',
    body: {
      ...input,
      type: input.type ?? 'group',
    },
    accessToken,
  });
}

export function createDirectGroup(
  input: CreateDirectGroupInput,
  accessToken: string,
) {
  return apiRequest<CreateDirectGroupResponse>('/groups/direct', {
    method: 'POST',
    body: input,
    accessToken,
  });
}

export function listGroups(
  accessToken: string,
  params?: ListGroupsParams,
) {
  return apiRequest<ListGroupsResponse>(
    `/groups${buildGroupsQuery(params)}`,
    {
      method: 'GET',
      accessToken,
    },
  );
}

export function getGroupDetails(groupId: string, accessToken: string) {
  return apiRequest<GroupDetailsResponse>(`/groups/${groupId}`, {
    method: 'GET',
    accessToken,
  });
}

export function listGroupMembers(groupId: string, accessToken: string) {
  return apiRequest<ListGroupMembersResponse>(`/groups/${groupId}/members`, {
    method: 'GET',
    accessToken,
  });
}

export function getGroupBalances(groupId: string, accessToken: string) {
  return apiRequest<GroupBalancesResponse>(`/groups/${groupId}/balances`, {
    method: 'GET',
    accessToken,
  });
}

export function updateGroup(
  groupId: string,
  input: UpdateGroupInput,
  accessToken: string,
) {
  return apiRequest<UpdateGroupResponse>(`/groups/${groupId}`, {
    method: 'PATCH',
    body: input,
    accessToken,
  });
}