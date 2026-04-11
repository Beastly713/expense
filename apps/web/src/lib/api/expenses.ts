import { apiRequest } from './client';

export type ExpenseSplitMethod = 'equal' | 'exact' | 'percent' | 'shares';

export interface CreateGroupExpenseSplitInput {
  membershipId: string;
  inputValue?: number;
}

export interface CreateGroupExpenseInput {
  title: string;
  notes?: string | null;
  amountMinor: number;
  currency: string;
  dateIncurred: string;
  payerMembershipId: string;
  splitMethod: ExpenseSplitMethod;
  splits: CreateGroupExpenseSplitInput[];
}

export interface ExpenseListItem {
  id: string;
  title: string;
  amountMinor: number;
  currency: string;
  dateIncurred: string;
  payerMembershipId: string;
  splitMethod: ExpenseSplitMethod;
  isDeleted: boolean;
  createdAt: string;
}

export interface ExpenseListResponse {
  items: ExpenseListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface ExpenseDetailsResponse {
  expense: {
    id: string;
    groupId: string;
    title: string;
    notes: string | null;
    amountMinor: number;
    currency: string;
    dateIncurred: string;
    payerMembershipId: string;
    splitMethod: ExpenseSplitMethod;
    isDeleted: boolean;
  };
  splits: Array<{
    membershipId: string;
    owedShareMinor: number;
  }>;
}

export interface CreateGroupExpenseResponse {
  expense: {
    id: string;
    groupId: string;
    title: string;
    amountMinor: number;
    currency: string;
    payerMembershipId: string;
    splitMethod: ExpenseSplitMethod;
    dateIncurred: string;
    isDeleted: boolean;
  };
  splits: Array<{
    membershipId: string;
    owedShareMinor: number;
  }>;
}

export interface ListGroupExpensesParams {
  page?: number;
  limit?: number;
  search?: string;
  includeDeleted?: boolean;
}

function buildExpenseListQuery(params?: ListGroupExpensesParams): string {
  const searchParams = new URLSearchParams();

  if (params?.page != null) {
    searchParams.set('page', String(params.page));
  }

  if (params?.limit != null) {
    searchParams.set('limit', String(params.limit));
  }

  if (params?.search && params.search.trim().length > 0) {
    searchParams.set('search', params.search.trim());
  }

  if (params?.includeDeleted != null) {
    searchParams.set('includeDeleted', String(params.includeDeleted));
  }

  const query = searchParams.toString();
  return query.length > 0 ? `?${query}` : '';
}

export function createGroupExpense(
  groupId: string,
  input: CreateGroupExpenseInput,
  accessToken: string,
) {
  return apiRequest<CreateGroupExpenseResponse>(`/groups/${groupId}/expenses`, {
    method: 'POST',
    body: input,
    accessToken,
  });
}

export function listGroupExpenses(
  groupId: string,
  accessToken: string,
  params?: ListGroupExpensesParams,
) {
  return apiRequest<ExpenseListResponse>(
    `/groups/${groupId}/expenses${buildExpenseListQuery(params)}`,
    {
      method: 'GET',
      accessToken,
    },
  );
}

export function getExpenseDetails(expenseId: string, accessToken: string) {
  return apiRequest<ExpenseDetailsResponse>(`/expenses/${expenseId}`, {
    method: 'GET',
    accessToken,
  });
}