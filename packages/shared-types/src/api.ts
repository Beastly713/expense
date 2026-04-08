export const API_ERROR_CODES = [
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'INVALID_CREDENTIALS',
  'INVALID_TOKEN',
  'EXPIRED_TOKEN',
  'GROUP_BALANCE_NOT_ZERO',
  'INVALID_SPLIT_TOTAL',
  'INVALID_SETTLEMENT_AMOUNT',
  'ALREADY_INVITED',
  'ALREADY_MEMBER',
  'EXPENSE_ALREADY_DELETED',
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: Record<string, unknown> | null;
}

export interface ApiSuccessResponse<TData> {
  success: true;
  data: TData;
}

export interface ApiErrorResponse {
  success: false;
  error: ApiError;
}

export type ApiResponse<TData> = ApiSuccessResponse<TData> | ApiErrorResponse;

export interface PaginatedMeta {
  page: number;
  limit: number;
  total: number;
}