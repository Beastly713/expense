import { apiRequest } from './client';

export interface DashboardSummaryResponse {
  totalYouOweMinor: number;
  totalYouAreOwedMinor: number;
  netBalanceMinor: number;
  groupCount: number;
  directLedgerCount: number;
}

export function getDashboardSummary(accessToken: string) {
  return apiRequest<DashboardSummaryResponse>('/dashboard/summary', {
    method: 'GET',
    accessToken,
  });
}