/// <reference types="node" />
import { test, expect } from '@playwright/test';

function uniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}.${Math.random().toString(16).slice(2)}@example.com`;
}

test('user can add a group expense and see balances + dashboard summary update', async ({
  page,
}) => {
  const userAEmail = uniqueEmail('e2e-expense-user-a');
  const pendingMemberEmail = uniqueEmail('e2e-expense-pending');
  const password = 'StrongPass123';

  await page.goto('/signup');

  await page.getByLabel('Full name').fill('User A');
  await page.getByLabel('Email').fill(userAEmail);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign up', exact: true }).click();

  await expect(page.getByText('Onboarding')).toBeVisible();

  await page
    .getByRole('button', { name: 'Create your first group', exact: true })
    .click();

  await page.getByLabel('Group name').fill('Playwright Expense Group');
  await page.getByLabel('Default currency').fill('INR');
  await page.getByRole('button', { name: 'Create group', exact: true }).click();

  await expect(page).toHaveURL(/\/groups\/.+/);
  await expect(
    page.getByRole('heading', {
      name: 'Playwright Expense Group',
      exact: true,
    }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Invite members' }).click();
await page.getByLabel('Email addresses').fill(pendingMemberEmail);
await page.getByRole('button', { name: 'Send invites', exact: true }).click();

await expect(page.getByText('Invite sent successfully.')).toBeVisible();

await page.getByRole('button', { name: 'Close', exact: true }).click();
await expect(page.locator('[role="dialog"][aria-modal="true"]')).toHaveCount(0);

const pendingInvitesSection = page.locator('section').filter({
  has: page.getByRole('heading', { name: 'Pending invites' }),
});

await expect(
  pendingInvitesSection.locator('p').filter({ hasText: pendingMemberEmail }).first(),
).toBeVisible();

  await page.getByRole('link', { name: 'Add expense', exact: true }).click();

  await expect(page).toHaveURL(/\/expenses\/new\?groupId=/);

  await page.getByPlaceholder('Dinner').fill('Dinner');
  await page.getByPlaceholder('1200.00').fill('12.00');

  await page.getByRole('button', { name: 'Save expense', exact: true }).click();

  await expect(page).toHaveURL(/\/groups\/.+/);
  await expect(
    page.getByRole('heading', {
      name: 'Playwright Expense Group',
      exact: true,
    }),
  ).toBeVisible();

  const expensesSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Expenses' }),
  });

  await expect(expensesSection.getByText('Dinner', { exact: true })).toBeVisible();

  const balancesSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Simplified balances' }),
  });

  await expect(
    balancesSection.getByText(pendingMemberEmail, { exact: true }),
  ).toBeVisible();
  await expect(balancesSection.getByText('User A', { exact: true })).toBeVisible();
  await expect(balancesSection.getByText(/owes/i)).toBeVisible();

  const activeMembersSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Members' }),
  });

  await expect(activeMembersSection.getByText('User A', { exact: true })).toBeVisible();
  await expect(activeMembersSection.getByText(/Gets back/i)).toBeVisible();

  await page.goto('/dashboard');

  await expect(
    page.getByRole('heading', { name: /Welcome back, User A\./ }),
  ).toBeVisible();

const summaryCards = page.locator('section').filter({
  has: page.getByRole('heading', { name: /Welcome back, User A\./ }),
});

await expect(summaryCards.getByText(/^You owe\s*0\.00$/).first()).toBeVisible();
await expect(
  summaryCards.getByText(/^You are owed\s*6\.00$/).first(),
).toBeVisible();
await expect(
  summaryCards.getByText(/^Net balance\s*6\.00$/).first(),
).toBeVisible();
await expect(summaryCards.getByText(/^Groups\s*1$/).first()).toBeVisible();

  await expect(page.getByText('Playwright Expense Group', { exact: true })).toBeVisible();
});