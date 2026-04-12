/// <reference types="node" />
import { expect, test } from '@playwright/test';

function uniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}.${Math.random().toString(16).slice(2)}@example.com`;
}

test('user can create a direct ledger, add an expense, record a partial settlement, and see updates on friend page + dashboard', async ({
  page,
}) => {
  const friendEmail = uniqueEmail('e2e-direct-friend');
  const ownerEmail = uniqueEmail('e2e-direct-owner');
  const password = 'StrongPass123';

  // Create the friend account first so direct-ledger creation can target an existing user.
  await page.goto('/signup');
  await page.getByLabel('Full name').fill('Friend User');
  await page.getByLabel('Email').fill(friendEmail);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign up', exact: true }).click();

  await expect(page.getByText('Onboarding')).toBeVisible();
  await page.getByRole('button', { name: 'Logout', exact: true }).click();
  await expect(page).toHaveURL(/\/login/);

  // Sign up the owner user who will create the direct ledger.
  await page.goto('/signup');
  await page.getByLabel('Full name').fill('Owner User');
  await page.getByLabel('Email').fill(ownerEmail);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign up', exact: true }).click();
  await expect(page.getByText('Onboarding')).toBeVisible();

  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/dashboard/);

  const directLedgerSection = page.locator('section').filter({
    has: page.getByRole('heading', {
      name: 'Start a direct ledger',
      exact: true,
    }),
  });

  await expect(directLedgerSection).toBeVisible();
  await expect(
    directLedgerSection.getByLabel('Friend email', { exact: true }),
  ).toBeVisible();

  // Create/open a direct ledger from the dashboard.
  await directLedgerSection.getByLabel('Friend email').fill(friendEmail);
  await directLedgerSection
    .getByRole('button', { name: 'Open friend ledger', exact: true })
    .click();

  await expect(page).toHaveURL(/\/friends\/.+/);
  await expect(
    page.getByRole('heading', { name: 'Friend User', exact: true }),
  ).toBeVisible();

  // Add an expense in the direct ledger.
  await page.getByRole('link', { name: 'Add expense', exact: true }).click();
  await expect(page).toHaveURL(/\/expenses\/new\?groupId=/);
  await expect(
    page.getByRole('heading', { name: /New expense in/i }),
  ).toBeVisible();
  await expect(page.getByLabel('Title')).toBeVisible();

  await page.getByLabel('Title').fill('Direct dinner');
  await page.getByLabel('Amount').fill('12.00');
  await page.getByLabel('Payer').selectOption({ label: 'Owner User' });

  const participantsSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: /Who is involved/i }),
  });

  await participantsSection.getByLabel(/Owner User/i).check();
  await participantsSection.getByLabel(/Friend User/i).check();

  await page.getByRole('button', { name: 'Save expense', exact: true }).click();

  await expect(page).toHaveURL(/\/friends\/.+/);

  const balanceSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Current balance', exact: true }),
  });

  await expect(
    balanceSection.getByText('Friend User', { exact: true }),
  ).toBeVisible();
  await expect(balanceSection).toContainText(/6\.00/);

  const expenseHistorySection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Expense history', exact: true }),
  });

  await expect(
    expenseHistorySection.getByText('Direct dinner', { exact: true }),
  ).toBeVisible();

  // Record a partial settlement from the friend page.
  await balanceSection
    .getByRole('button', { name: 'Settle up', exact: true })
    .click();

  await expect(
    page.getByRole('heading', { name: 'Settle up', exact: true }),
  ).toBeVisible();

  const amountInput = page.getByLabel('Amount');
  await amountInput.fill('3.00');

  await page.getByLabel(/Note/i).fill('Paid back part in cash');
  await page
    .getByRole('button', { name: 'Record settlement', exact: true })
    .click();

  await expect(
    page.getByRole('heading', { name: 'Friend User', exact: true }),
  ).toBeVisible();

  // Remaining balance should still be visible after partial settlement.
  await expect(balanceSection).toContainText(/3\.00/);

  const settlementHistorySection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Settlement history', exact: true }),
  });

  await expect(
    settlementHistorySection.getByText('Paid back part in cash', {
      exact: true,
    }),
  ).toBeVisible();

  const activitySection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Recent activity', exact: true }),
  });

  await expect(
    activitySection.getByText(/Settlement recorded/i),
  ).toBeVisible();

  // Dashboard should show the direct ledger entry in Friends.
  await page.goto('/dashboard');
  await expect(
    page.getByRole('heading', { name: /Welcome back/i }),
  ).toBeVisible();

  const friendsSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Friends', exact: true }),
  });

  await expect(
    friendsSection.getByText('Owner User & Friend User', { exact: true }),
  ).toBeVisible();
  await expect(
    friendsSection.getByText('3.00', { exact: true }).first(),
  ).toBeVisible();
});