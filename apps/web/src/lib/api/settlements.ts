import { apiRequest } from './client';

export interface SettlementHistoryItem {
  id: string;
  fromMembershipId: string;
  toMembershipId: string;
  amountMinor: number;
  currency: string;
  method: 'cash';
  note?: string | null;
  settledAt: string;
  createdAt: string;
}

export interface SettlementListResponse {
  items: SettlementHistoryItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface ListGroupSettlementsParams {
  page?: number;
  limit?: number;
}

export interface CreateGroupSettlementInput {
  fromMembershipId: string;
  toMembershipId: string;
  amountMinor: number;
  currency: string;
  method?: 'cash';
  note?: string | null;
}

export interface CreateGroupSettlementResponse {
  settlement: {
    id: string;
    groupId: string;
    fromMembershipId: string;
    toMembershipId: string;
    amountMinor: number;
    currency: string;
    method: 'cash';
    note?: string | null;
    settledAt: string;
  };
}

function buildSettlementQuery(params?: ListGroupSettlementsParams): string {
  const searchParams = new URLSearchParams();

  if (params?.page != null) {
    searchParams.set('page', String(params.page));
  }

  if (params?.limit != null) {
    searchParams.set('limit', String(params.limit));
  }

  const query = searchParams.toString();
  return query.length > 0 ? `?${query}` : '';
}

export function listGroupSettlements(
  groupId: string,
  accessToken: string,
  params?: ListGroupSettlementsParams,
) {
  return apiRequest<SettlementListResponse>(
    `/groups/${groupId}/settlements${buildSettlementQuery(params)}`,
    {
      method: 'GET',
      accessToken,
    },
  );
}

export function createGroupSettlement(
  groupId: string,
  input: CreateGroupSettlementInput,
  accessToken: string,
) {
  return apiRequest<CreateGroupSettlementResponse>(
    `/groups/${groupId}/settlements`,
    {
      method: 'POST',
      body: {
        ...input,
        method: input.method ?? 'cash',
        note: input.note ?? null,
      },
      accessToken,
    },
  );
}