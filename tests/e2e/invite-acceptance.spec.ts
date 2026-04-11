/// <reference types="node" />
import { test, expect } from '@playwright/test';
import { MongoClient } from 'mongodb';

function uniqueEmail(prefix: string): string {
  return `${prefix}.${Date.now()}.${Math.random().toString(16).slice(2)}@example.com`;
}

function getMongoUri(): string {
  return (
    process.env.MONGODB_URI_TEST?.trim() ||
    process.env.MONGODB_URI?.trim() ||
    'mongodb://127.0.0.1:27017/splitwise_api_test'
  );
}

async function getPendingInviteToken(email: string): Promise<string> {
  const client = new MongoClient(getMongoUri());

  try {
    await client.connect();
    const db = client.db();

    const invite = await db.collection('invitations').findOne(
      {
        email: email.toLowerCase(),
        status: 'pending',
      },
      {
        sort: { createdAt: -1 },
      },
    );

    if (!invite || typeof invite.token !== 'string') {
      throw new Error(`Pending invite not found for ${email}`);
    }

    return invite.token;
  } finally {
    await client.close();
  }
}

test('user A invites user B and user B accepts invite', async ({ browser, page }) => {
  const userAEmail = uniqueEmail('e2e-user-a');
  const userBEmail = uniqueEmail('e2e-user-b');
  const password = 'StrongPass123';

  await page.goto('/signup');

  await page.getByLabel('Full name').fill('User A');
  await page.getByLabel('Email').fill(userAEmail);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign up', exact: true }).click();

  await expect(page.getByText('Onboarding')).toBeVisible();
  await page.getByRole('button', { name: 'Create your first group', exact: true }).click();

  await page.getByLabel('Group name').fill('Playwright Trip');
  await page.getByLabel('Default currency').fill('INR');
  await page.getByRole('button', { name: 'Create group', exact: true }).click();

  await expect(page).toHaveURL(/\/groups\/.+/);
  await expect(page.getByText('Playwright Trip')).toBeVisible();

  await page.getByRole('button', { name: 'Invite members' }).click();
  await page.getByLabel('Email addresses').fill(userBEmail);
  await page.getByRole('button', { name: 'Send invites', exact: true }).click();

  await expect(page.getByText('Invite sent successfully.')).toBeVisible();
  await expect(page.getByText(userBEmail)).toBeVisible();

  const inviteToken = await getPendingInviteToken(userBEmail);

  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();

  await pageB.goto(`/invite/${inviteToken}`);
  await expect(pageB.getByText('Sign up or log in to continue')).toBeVisible();

  await pageB.getByRole('link', { name: 'Sign up' }).click();

  await pageB.getByLabel('Full name').fill('User B');
  await pageB.getByLabel('Email').fill(userBEmail);
  await pageB.getByLabel('Password', { exact: true }).fill(password);
  await pageB.getByLabel('Confirm password', { exact: true }).fill(password);
  await pageB.getByRole('button', { name: 'Sign up', exact: true }).click();

  await expect(pageB.getByText('Accept this group invite')).toBeVisible();
  await pageB.getByRole('button', { name: 'Accept invite', exact: true }).click();

  await expect(pageB.getByText('You joined the group')).toBeVisible();
  await pageB.getByRole('link', { name: 'Open group' }).click();

  await expect(pageB).toHaveURL(/\/groups\/.+/);
  await expect(
    pageB.getByRole('heading', { name: 'User B', exact: true }),
  ).toBeVisible();

  await page.reload();
  await expect(page.getByText(userBEmail)).toHaveCount(0);

  await contextB.close();
});