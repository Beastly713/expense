/// <reference types="node" />

import { expect, test } from '@playwright/test';

function uniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}.${Math.random().toString(16).slice(2)}@example.com`;
}

test('user can edit, delete, and restore a group expense while seeing balances and activity update', async ({
  page,
}) => {
  const userEmail = uniqueEmail('e2e-lifecycle-user');
  const pendingMemberEmail = uniqueEmail('e2e-lifecycle-pending');
  const password = 'StrongPass123';

  await page.goto('/signup');
  await page.getByLabel('Full name').fill('Lifecycle User');
  await page.getByLabel('Email').fill(userEmail);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign up', exact: true }).click();

  await expect(page.getByText('Onboarding')).toBeVisible();

  await page
    .getByRole('button', { name: 'Create your first group', exact: true })
    .click();

  await page.getByLabel('Group name').fill('Expense Lifecycle Group');
  await page.getByLabel('Default currency').fill('INR');
  await page.getByRole('button', { name: 'Create group', exact: true }).click();

  await expect(page).toHaveURL(/\/groups\/.+/);
  await expect(
    page.getByRole('heading', {
      name: 'Expense Lifecycle Group',
      exact: true,
    }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Invite members' }).click();
  await page.getByLabel('Email addresses').fill(pendingMemberEmail);
  await page.getByRole('button', { name: 'Send invites', exact: true }).click();
  await expect(page.getByText('Invite sent successfully.')).toBeVisible();
  await page.getByRole('button', { name: 'Close', exact: true }).click();

  await page.getByRole('link', { name: 'Add expense', exact: true }).click();
  await expect(page).toHaveURL(/\/expenses\/new\?groupId=/);

  await page.getByLabel('Title').fill('Dinner');
  await page.getByLabel('Amount').fill('12.00');
  await page.getByRole('button', { name: 'Save expense', exact: true }).click();

  await expect(page).toHaveURL(/\/groups\/.+/);

  const expensesSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Recent expenses', exact: true }),
  });
  const balancesSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Simplified balances', exact: true }),
  });
  const activitySection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Recent activity', exact: true }),
  });

  await expect(expensesSection.getByText('Dinner', { exact: true })).toBeVisible();
  await expect(
    balancesSection.getByText(pendingMemberEmail, { exact: true }),
  ).toBeVisible();

  await expensesSection.getByRole('link', { name: 'Edit', exact: true }).first().click();
  await expect(page).toHaveURL(/\/expenses\/.+\/edit/);
  await expect(
    page.getByRole('heading', { name: 'Edit expense', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText('Editing this expense will recalculate balances.', {
      exact: true,
    }),
  ).toBeVisible();

  await page.getByLabel('Title').fill('Edited Dinner');
  await page.getByLabel('Amount').fill('20.00');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();

  await expect(page).toHaveURL(/\/groups\/.+/);
  await expect(
    expensesSection.getByText('Edited Dinner', { exact: true }),
  ).toBeVisible();

  await expensesSection
    .getByRole('button', { name: 'Delete', exact: true })
    .first()
    .click();

  await expect(
    page.getByRole('heading', { name: 'Delete expense', exact: true }),
  ).toBeVisible();

  await page
    .getByRole('button', { name: 'Delete expense', exact: true })
    .click();

  await expect(page.getByText('Expense deleted successfully.')).toBeVisible();
  await expect(
    expensesSection.getByText('Edited Dinner', { exact: true }),
  ).toHaveCount(0);
  await expect(
    balancesSection.getByText('Everyone is settled up.', { exact: true }),
  ).toBeVisible();

    await expect(
    activitySection.getByText('Lifecycle User deleted "Edited Dinner"', {
      exact: true,
    }),
  ).toBeVisible();

  await activitySection.getByRole('button', { name: 'Restore', exact: true }).click();

  await expect(page.getByText('Expense restored successfully.')).toBeVisible();
  await expect(
    expensesSection.getByText('Edited Dinner', { exact: true }),
  ).toBeVisible();
  await expect(
    balancesSection.getByText(pendingMemberEmail, { exact: true }),
  ).toBeVisible();
});