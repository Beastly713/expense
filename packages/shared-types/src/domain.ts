export type CurrencyCode = string;

export const GROUP_TYPES = ['group', 'direct'] as const;
export type GroupType = (typeof GROUP_TYPES)[number];

export const MEMBERSHIP_STATUSES = ['active', 'pending', 'removed'] as const;
export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export const INVITATION_STATUSES = ['pending', 'accepted', 'cancelled', 'expired'] as const;
export type InvitationStatus = (typeof INVITATION_STATUSES)[number];

export const SPLIT_METHODS = ['equal', 'exact', 'percent', 'shares'] as const;
export type SplitMethod = (typeof SPLIT_METHODS)[number];

export const SETTLEMENT_METHODS = ['cash'] as const;
export type SettlementMethod = (typeof SETTLEMENT_METHODS)[number];

export const NOTIFICATION_TYPES = [
  'invite_received',
  'expense_added',
  'expense_edited',
  'expense_deleted',
  'expense_restored',
  'settlement_recorded',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const ACTIVITY_ACTION_TYPES = [
  'group_created',
  'member_invited',
  'invite_accepted',
  'expense_added',
  'expense_edited',
  'expense_deleted',
  'expense_restored',
  'settlement_recorded',
  'member_removed',
] as const;
export type ActivityActionType = (typeof ACTIVITY_ACTION_TYPES)[number];