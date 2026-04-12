/// <reference types="node" />

import { expect, test } from '@playwright/test';

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

  const pendingInvitesSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Pending invites', exact: true }),
  });

  await expect(
    pendingInvitesSection.getByText(pendingMemberEmail, { exact: true }),
  ).toBeVisible();

  await page.getByRole('link', { name: 'Add expense', exact: true }).click();
  await expect(page).toHaveURL(/\/expenses\/new\?groupId=/);

  await page.getByLabel('Title').fill('Dinner');
  await page.getByLabel('Amount').fill('12.00');
  await page.getByRole('button', { name: 'Save expense', exact: true }).click();

  await expect(page).toHaveURL(/\/groups\/.+/);

  const expensesSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Recent expenses', exact: true }),
  });

  await expect(expensesSection.getByText('Dinner', { exact: true })).toBeVisible();

  const balancesSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Simplified balances', exact: true }),
  });

  await expect(
    balancesSection.getByText(pendingMemberEmail, { exact: true }),
  ).toBeVisible();

  await page.goto('/dashboard');

  await expect(
    page.getByRole('heading', { name: /Welcome back/i }),
  ).toBeVisible();

  const groupsSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Your groups', exact: true }),
  });

    await expect(
    groupsSection.getByText('Playwright Expense Group', { exact: true }).first(),
  ).toBeVisible();

  await expect(groupsSection.getByText('6.00', { exact: true }).first()).toBeVisible();
  const activityPreview = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Recent activity', exact: true }),
  });

  await expect(
    activityPreview.getByText('Playwright Expense Group', { exact: true }).first(),
  ).toBeVisible();
});