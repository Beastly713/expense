import { apiRequest } from './client';

export interface GroupActivityItem {
  id: string;
  actionType:
    | 'group_created'
    | 'member_invited'
    | 'invite_accepted'
    | 'expense_added'
    | 'expense_edited'
    | 'expense_deleted'
    | 'expense_restored'
    | 'settlement_recorded';
  entityType: 'group' | 'expense' | 'settlement' | 'invitation' | 'membership';
  entityId: string;
  actorUserId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface GroupActivityResponse {
  items: GroupActivityItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface ListActivityParams {
  page?: number;
  limit?: number;
}

function buildActivityQuery(params?: ListActivityParams): string {
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

export function listGroupActivity(
  groupId: string,
  accessToken: string,
  params?: ListActivityParams,
) {
  return apiRequest<GroupActivityResponse>(
    `/groups/${groupId}/activity${buildActivityQuery(params)}`,
    {
      method: 'GET',
      accessToken,
    },
  );
}