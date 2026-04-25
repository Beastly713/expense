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

    const timeoutMs = 10_000;
    const pollIntervalMs = 250;
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const admin = client.db().admin();
      const databases = await admin.listDatabases();

      for (const databaseInfo of databases.databases) {
        const dbName = databaseInfo.name;

        if (!dbName) {
          continue;
        }

        const db = client.db(dbName);

        const collections = await db
          .listCollections({ name: 'invitations' }, { nameOnly: true })
          .toArray();

        if (collections.length === 0) {
          continue;
        }

        const invite = await db.collection('invitations').findOne(
          {
            email: email.toLowerCase(),
            status: 'pending',
          },
          {
            sort: { createdAt: -1 },
          },
        );

        if (invite && typeof invite.token === 'string') {
          return invite.token;
        }
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(`Pending invite not found for ${email}`);
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

  const pendingInvitesSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Pending invites' }),
  });

  await expect(
    pendingInvitesSection.locator('p').filter({ hasText: userBEmail }).first(),
  ).toBeVisible();

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

  await expect(
    pageB.getByRole('heading', {
      name: 'Accept this group invite',
      exact: true,
    }),
  ).toBeVisible();
  await pageB.getByRole('button', { name: 'Accept invite', exact: true }).click();

  await expect(pageB.getByText('You joined the group')).toBeVisible();
  await pageB.getByRole('link', { name: 'Open group' }).click();

  await expect(pageB).toHaveURL(/\/groups\/.+/);
  await expect(
    pageB.getByRole('heading', { name: 'Playwright Trip', exact: true }),
  ).toBeVisible();

  const activeMembersSectionB = pageB.locator('section').filter({
    has: pageB.getByRole('heading', { name: 'Members' }),
  });

  await expect(activeMembersSectionB.getByText('User B', { exact: true })).toBeVisible();

  await page.reload();

  const pendingInvitesSectionAfterAccept = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Pending invites' }),
  });

  await expect(
    pendingInvitesSectionAfterAccept.locator('p').filter({ hasText: userBEmail }),
  ).toHaveCount(0);

  const activeMembersSectionA = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Members' }),
  });

  await expect(activeMembersSectionA.getByText('User B', { exact: true })).toBeVisible();

  await contextB.close();
});

test('user B can see and accept a pending group invite from dashboard', async ({
  browser,
  page,
}) => {
  const userAEmail = uniqueEmail('e2e-dashboard-invite-a');
  const userBEmail = uniqueEmail('e2e-dashboard-invite-b');
  const password = 'StrongPass123';
  const groupName = 'Dashboard Invite Group';

  await page.goto('/signup');

  await page.getByLabel('Full name').fill('Dashboard Inviter');
  await page.getByLabel('Email').fill(userAEmail);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign up', exact: true }).click();

  await expect(page.getByText('Onboarding')).toBeVisible();
  await page
    .getByRole('button', { name: 'Create your first group', exact: true })
    .click();

  await page.getByLabel('Group name').fill(groupName);
  await page.getByLabel('Default currency').fill('INR');
  await page.getByRole('button', { name: 'Create group', exact: true }).click();

  await expect(page).toHaveURL(/\/groups\/.+/);
  await expect(
    page.getByRole('heading', { name: groupName, exact: true }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Invite members' }).click();
  await page.getByLabel('Email addresses').fill(userBEmail);
  await page.getByRole('button', { name: 'Send invites', exact: true }).click();

  await expect(page.getByText('Invite sent successfully.')).toBeVisible();

  const pendingInvitesSection = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Pending invites' }),
  });

  await expect(
    pendingInvitesSection.locator('p').filter({ hasText: userBEmail }).first(),
  ).toBeVisible();

  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();

  await pageB.goto('/signup');

  await pageB.getByLabel('Full name').fill('Dashboard Invitee');
  await pageB.getByLabel('Email').fill(userBEmail);
  await pageB.getByLabel('Password', { exact: true }).fill(password);
  await pageB.getByLabel('Confirm password', { exact: true }).fill(password);
  await pageB.getByRole('button', { name: 'Sign up', exact: true }).click();

  await expect(pageB.getByText('Onboarding')).toBeVisible();
  await pageB.getByRole('button', { name: 'Skip for now', exact: true }).click();

  await expect(pageB).toHaveURL(/\/dashboard/);

  const dashboardPendingInvitesSection = pageB.locator('section').filter({
    has: pageB.getByRole('heading', { name: 'Pending invites', exact: true }),
  });

  await expect(dashboardPendingInvitesSection).toBeVisible();
  await expect(
    dashboardPendingInvitesSection.getByText(groupName, { exact: true }),
  ).toBeVisible();
  await expect(
    dashboardPendingInvitesSection.getByText(userBEmail, { exact: false }),
  ).toBeVisible();

  await dashboardPendingInvitesSection
    .getByRole('button', { name: 'Accept invite', exact: true })
    .click();

  await expect(
    dashboardPendingInvitesSection.getByText(
      `Joined ${groupName} successfully.`,
      { exact: true },
    ),
  ).toBeVisible();

  await dashboardPendingInvitesSection
    .getByRole('link', { name: 'Open group', exact: true })
    .click();

  await expect(pageB).toHaveURL(/\/groups\/.+/);
  await expect(
    pageB.getByRole('heading', { name: groupName, exact: true }),
  ).toBeVisible();

  const activeMembersSectionB = pageB.locator('section').filter({
    has: pageB.getByRole('heading', { name: 'Members' }),
  });

  await expect(
    activeMembersSectionB.getByText('Dashboard Invitee', { exact: true }),
  ).toBeVisible();

  await page.reload();

  const pendingInvitesSectionAfterAccept = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Pending invites' }),
  });

  await expect(
    pendingInvitesSectionAfterAccept.locator('p').filter({ hasText: userBEmail }),
  ).toHaveCount(0);

  const activeMembersSectionA = page.locator('section').filter({
    has: page.getByRole('heading', { name: 'Members' }),
  });

  await expect(
    activeMembersSectionA.getByText('Dashboard Invitee', { exact: true }),
  ).toBeVisible();

  await contextB.close();
});