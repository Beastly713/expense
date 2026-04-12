import { apiRequest } from './client';

export type ExpenseSplitMethod = 'equal' | 'exact' | 'percent' | 'shares';
export type ExpenseSplitInputType = ExpenseSplitMethod;

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

export type UpdateExpenseInput = CreateGroupExpenseInput;

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
    version: number;
    updatedAt: string;
  };
  splits: Array<{
    membershipId: string;
    inputType: ExpenseSplitInputType;
    inputValue: number | null;
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

export interface UpdateExpenseResponse {
  expense: {
    id: string;
    title: string;
    amountMinor: number;
    splitMethod: ExpenseSplitMethod;
    updatedAt: string;
    version: number;
  };
}

export interface DeleteExpenseResponse {
  message: string;
}

export interface RestoreExpenseResponse {
  message: string;
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

export function updateExpense(
  expenseId: string,
  input: UpdateExpenseInput,
  accessToken: string,
) {
  return apiRequest<UpdateExpenseResponse>(`/expenses/${expenseId}`, {
    method: 'PATCH',
    body: input,
    accessToken,
  });
}

export function deleteExpense(expenseId: string, accessToken: string) {
  return apiRequest<DeleteExpenseResponse>(`/expenses/${expenseId}`, {
    method: 'DELETE',
    accessToken,
  });
}

export function restoreExpense(expenseId: string, accessToken: string) {
  return apiRequest<RestoreExpenseResponse>(`/expenses/${expenseId}/restore`, {
    method: 'POST',
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