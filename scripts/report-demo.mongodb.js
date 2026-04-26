// scripts/report-demo.mongodb.js
//
// Ledgerly MongoDB report/demo script.
// This script is intentionally isolated from the normal local project database.
// It only uses the ledgerly_report_demo database.
//
// Run:
//   mongosh --file scripts/report-demo.mongodb.js
//
// Optional cleanup:
//   Change CLEANUP_AT_END to true if you want the demo DB removed after the script finishes.

const DEMO_DB_NAME = "ledgerly_report_demo";
const CLEANUP_AT_END = false;

const demoDb = db.getSiblingDB(DEMO_DB_NAME);

if (demoDb.getName() !== DEMO_DB_NAME) {
  throw new Error("Safety check failed. Script is not using the demo database.");
}

function section(title) {
  print("\n");
  print("============================================================");
  print(title);
  print("============================================================");
}

function run(title, queryText, fn) {
  print("\n------------------------------------------------------------");
  print(title);
  print("Query:");
  print(queryText);
  print("Output:");
  const result = fn();
  printjson(result);
}

section("0. SAFETY CHECK AND FRESH START");

run(
  "Using only the demo database",
  `db.getSiblingDB("${DEMO_DB_NAME}").getName()`,
  () => demoDb.getName()
);

run(
  "Drop demo database for a fresh run",
  `db.getSiblingDB("${DEMO_DB_NAME}").dropDatabase()`,
  () => demoDb.dropDatabase()
);

const now = new Date();

const rahulUserId = new ObjectId();
const aishaUserId = new ObjectId();
const sameerUserId = new ObjectId();

const goaTripGroupId = new ObjectId();
const directGroupId = new ObjectId();

const rahulGoaMembershipId = new ObjectId();
const aishaGoaMembershipId = new ObjectId();
const sameerGoaMembershipId = new ObjectId();

const rahulDirectMembershipId = new ObjectId();
const aishaDirectMembershipId = new ObjectId();

const invitationId = new ObjectId();

const dinnerExpenseId = new ObjectId();
const cabExpenseId = new ObjectId();
const hotelExpenseId = new ObjectId();
const fuelExpenseId = new ObjectId();

const settlementId = new ObjectId();

section("1. CREATE INDEXES");

run(
  "Create unique index on users.email",
  `db.users.createIndex({ email: 1 }, { unique: true, name: "idx_users_email_unique" })`,
  () =>
    demoDb.users.createIndex(
      { email: 1 },
      { unique: true, name: "idx_users_email_unique" }
    )
);

run(
  "Create index on groups.createdByUserId",
  `db.groups.createIndex({ createdByUserId: 1 }, { name: "idx_groups_created_by" })`,
  () =>
    demoDb.groups.createIndex(
      { createdByUserId: 1 },
      { name: "idx_groups_created_by" }
    )
);

run(
  "Create compound index on memberships.groupId and memberships.userId",
  `db.memberships.createIndex({ groupId: 1, userId: 1 }, { name: "idx_memberships_group_user" })`,
  () =>
    demoDb.memberships.createIndex(
      { groupId: 1, userId: 1 },
      { name: "idx_memberships_group_user" }
    )
);

run(
  "Create unique index on invitations.token",
  `db.invitations.createIndex({ token: 1 }, { unique: true, name: "idx_invitations_token_unique" })`,
  () =>
    demoDb.invitations.createIndex(
      { token: 1 },
      { unique: true, name: "idx_invitations_token_unique" }
    )
);

run(
  "Create compound index on expenses.groupId and expenses.dateIncurred",
  `db.expenses.createIndex({ groupId: 1, dateIncurred: -1 }, { name: "idx_expenses_group_date" })`,
  () =>
    demoDb.expenses.createIndex(
      { groupId: 1, dateIncurred: -1 },
      { name: "idx_expenses_group_date" }
    )
);

run(
  "Create compound index on activitylogs.groupId and activitylogs.createdAt",
  `db.activitylogs.createIndex({ groupId: 1, createdAt: -1 }, { name: "idx_activity_group_created" })`,
  () =>
    demoDb.activitylogs.createIndex(
      { groupId: 1, createdAt: -1 },
      { name: "idx_activity_group_created" }
    )
);

section("2. CREATE DEMO DATA");

run(
  "Create demo users",
  `db.users.insertMany([
  { name: "Rahul Sharma", email: "rahul.demo@example.com", ... },
  { name: "Aisha Khan", email: "aisha.demo@example.com", ... },
  { name: "Sameer Verma", email: "sameer.demo@example.com", ... }
])`,
  () =>
    demoDb.users.insertMany([
      {
        _id: rahulUserId,
        name: "Rahul Sharma",
        email: "rahul.demo@example.com",
        passwordHash: "demo_hash_not_real",
        defaultCurrency: "INR",
        notificationPreferences: {
          emailEnabled: true,
          inAppEnabled: true,
        },
        lastLoginAt: now,
        refreshTokenHash: null,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: aishaUserId,
        name: "Aisha Khan",
        email: "aisha.demo@example.com",
        passwordHash: "demo_hash_not_real",
        defaultCurrency: "INR",
        notificationPreferences: {
          emailEnabled: true,
          inAppEnabled: true,
        },
        lastLoginAt: now,
        refreshTokenHash: null,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: sameerUserId,
        name: "Sameer Verma",
        email: "sameer.demo@example.com",
        passwordHash: "demo_hash_not_real",
        defaultCurrency: "INR",
        notificationPreferences: {
          emailEnabled: false,
          inAppEnabled: true,
        },
        lastLoginAt: null,
        refreshTokenHash: null,
        passwordResetTokenHash: null,
        passwordResetExpiresAt: null,
        createdAt: now,
        updatedAt: now,
      },
    ])
);

run(
  "Create one normal group and one direct friend ledger",
  `db.groups.insertMany([
  { name: "Goa Trip", type: "group", ... },
  { name: "Rahul & Aisha", type: "direct", ... }
])`,
  () =>
    demoDb.groups.insertMany([
      {
        _id: goaTripGroupId,
        type: "group",
        name: "Goa Trip",
        defaultCurrency: "INR",
        createdByUserId: rahulUserId,
        simplifyDebts: true,
        status: "active",
        lastActivityAt: now,
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: directGroupId,
        type: "direct",
        name: "Rahul & Aisha",
        defaultCurrency: "INR",
        createdByUserId: rahulUserId,
        simplifyDebts: true,
        status: "active",
        lastActivityAt: now,
        createdAt: now,
        updatedAt: now,
      },
    ])
);

run(
  "Create active and pending memberships",
  `db.memberships.insertMany([
  { groupId, userId, status: "active", ... },
  { groupId, userId: null, status: "pending", invitationId, ... }
])`,
  () =>
    demoDb.memberships.insertMany([
      {
        _id: rahulGoaMembershipId,
        groupId: goaTripGroupId,
        userId: rahulUserId,
        invitationId: null,
        status: "active",
        role: "member",
        displayNameSnapshot: "Rahul Sharma",
        emailSnapshot: "rahul.demo@example.com",
        joinedAt: now,
        invitedAt: null,
        leftAt: null,
        cachedNetBalanceMinor: 4400,
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: aishaGoaMembershipId,
        groupId: goaTripGroupId,
        userId: aishaUserId,
        invitationId: null,
        status: "active",
        role: "member",
        displayNameSnapshot: "Aisha Khan",
        emailSnapshot: "aisha.demo@example.com",
        joinedAt: now,
        invitedAt: null,
        leftAt: null,
        cachedNetBalanceMinor: -2200,
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: sameerGoaMembershipId,
        groupId: goaTripGroupId,
        userId: null,
        invitationId,
        status: "pending",
        role: "member",
        displayNameSnapshot: "sameer.demo@example.com",
        emailSnapshot: "sameer.demo@example.com",
        joinedAt: null,
        invitedAt: now,
        leftAt: null,
        cachedNetBalanceMinor: -2200,
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: rahulDirectMembershipId,
        groupId: directGroupId,
        userId: rahulUserId,
        invitationId: null,
        status: "active",
        role: "member",
        displayNameSnapshot: "Rahul Sharma",
        emailSnapshot: "rahul.demo@example.com",
        joinedAt: now,
        invitedAt: null,
        leftAt: null,
        cachedNetBalanceMinor: 0,
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: aishaDirectMembershipId,
        groupId: directGroupId,
        userId: aishaUserId,
        invitationId: null,
        status: "active",
        role: "member",
        displayNameSnapshot: "Aisha Khan",
        emailSnapshot: "aisha.demo@example.com",
        joinedAt: now,
        invitedAt: null,
        leftAt: null,
        cachedNetBalanceMinor: 0,
        createdAt: now,
        updatedAt: now,
      },
    ])
);

run(
  "Create invitation linked to pending membership",
  `db.invitations.insertOne({
  email: "sameer.demo@example.com",
  status: "pending",
  membershipId,
  token,
  ...
})`,
  () =>
    demoDb.invitations.insertOne({
      _id: invitationId,
      groupId: goaTripGroupId,
      email: "sameer.demo@example.com",
      invitedByUserId: rahulUserId,
      token: "demo-invite-token-sameer",
      status: "pending",
      membershipId: sameerGoaMembershipId,
      acceptedAt: null,
      expiresAt: new Date("2026-12-31T23:59:59.000Z"),
      createdAt: now,
      updatedAt: now,
    })
);

run(
  "Create expenses using all split methods",
  `db.expenses.insertMany([
  { title: "Dinner", splitMethod: "equal", ... },
  { title: "Cab", splitMethod: "exact", ... },
  { title: "Hotel", splitMethod: "percent", ... },
  { title: "Fuel", splitMethod: "shares", ... }
])`,
  () =>
    demoDb.expenses.insertMany([
      {
        _id: dinnerExpenseId,
        groupId: goaTripGroupId,
        createdByUserId: rahulUserId,
        title: "Dinner",
        notes: "Equal split dinner expense",
        amountMinor: 1500,
        currency: "INR",
        dateIncurred: new Date("2026-04-10T00:00:00.000Z"),
        payerMembershipId: rahulGoaMembershipId,
        splitMethod: "equal",
        participantCount: 3,
        isDeleted: false,
        deletedAt: null,
        deletedByUserId: null,
        version: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: cabExpenseId,
        groupId: goaTripGroupId,
        createdByUserId: aishaUserId,
        title: "Cab",
        notes: "Exact split cab expense",
        amountMinor: 900,
        currency: "INR",
        dateIncurred: new Date("2026-04-11T00:00:00.000Z"),
        payerMembershipId: aishaGoaMembershipId,
        splitMethod: "exact",
        participantCount: 3,
        isDeleted: false,
        deletedAt: null,
        deletedByUserId: null,
        version: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: hotelExpenseId,
        groupId: goaTripGroupId,
        createdByUserId: rahulUserId,
        title: "Hotel",
        notes: "Percentage split hotel booking",
        amountMinor: 10000,
        currency: "INR",
        dateIncurred: new Date("2026-04-12T00:00:00.000Z"),
        payerMembershipId: rahulGoaMembershipId,
        splitMethod: "percent",
        participantCount: 3,
        isDeleted: false,
        deletedAt: null,
        deletedByUserId: null,
        version: 1,
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: fuelExpenseId,
        groupId: goaTripGroupId,
        createdByUserId: sameerUserId,
        title: "Fuel",
        notes: "Shares based fuel split",
        amountMinor: 1200,
        currency: "INR",
        dateIncurred: new Date("2026-04-13T00:00:00.000Z"),
        payerMembershipId: sameerGoaMembershipId,
        splitMethod: "shares",
        participantCount: 3,
        isDeleted: false,
        deletedAt: null,
        deletedByUserId: null,
        version: 1,
        createdAt: now,
        updatedAt: now,
      },
    ])
);

run(
  "Create split rows for expenses",
  `db.splits.insertMany([
  { expenseId, membershipId, inputType, inputValue, owedShareMinor },
  ...
])`,
  () =>
    demoDb.splits.insertMany([
      {
        expenseId: dinnerExpenseId,
        membershipId: rahulGoaMembershipId,
        inputType: "equal",
        inputValue: null,
        owedShareMinor: 500,
        createdAt: now,
        updatedAt: now,
      },
      {
        expenseId: dinnerExpenseId,
        membershipId: aishaGoaMembershipId,
        inputType: "equal",
        inputValue: null,
        owedShareMinor: 500,
        createdAt: now,
        updatedAt: now,
      },
      {
        expenseId: dinnerExpenseId,
        membershipId: sameerGoaMembershipId,
        inputType: "equal",
        inputValue: null,
        owedShareMinor: 500,
        createdAt: now,
        updatedAt: now,
      },

      {
        expenseId: cabExpenseId,
        membershipId: rahulGoaMembershipId,
        inputType: "exact",
        inputValue: 300,
        owedShareMinor: 300,
        createdAt: now,
        updatedAt: now,
      },
      {
        expenseId: cabExpenseId,
        membershipId: aishaGoaMembershipId,
        inputType: "exact",
        inputValue: 300,
        owedShareMinor: 300,
        createdAt: now,
        updatedAt: now,
      },
      {
        expenseId: cabExpenseId,
        membershipId: sameerGoaMembershipId,
        inputType: "exact",
        inputValue: 300,
        owedShareMinor: 300,
        createdAt: now,
        updatedAt: now,
      },

      {
        expenseId: hotelExpenseId,
        membershipId: rahulGoaMembershipId,
        inputType: "percent",
        inputValue: 50,
        owedShareMinor: 5000,
        createdAt: now,
        updatedAt: now,
      },
      {
        expenseId: hotelExpenseId,
        membershipId: aishaGoaMembershipId,
        inputType: "percent",
        inputValue: 30,
        owedShareMinor: 3000,
        createdAt: now,
        updatedAt: now,
      },
      {
        expenseId: hotelExpenseId,
        membershipId: sameerGoaMembershipId,
        inputType: "percent",
        inputValue: 20,
        owedShareMinor: 2000,
        createdAt: now,
        updatedAt: now,
      },

      {
        expenseId: fuelExpenseId,
        membershipId: rahulGoaMembershipId,
        inputType: "shares",
        inputValue: 1,
        owedShareMinor: 300,
        createdAt: now,
        updatedAt: now,
      },
      {
        expenseId: fuelExpenseId,
        membershipId: aishaGoaMembershipId,
        inputType: "shares",
        inputValue: 1,
        owedShareMinor: 300,
        createdAt: now,
        updatedAt: now,
      },
      {
        expenseId: fuelExpenseId,
        membershipId: sameerGoaMembershipId,
        inputType: "shares",
        inputValue: 2,
        owedShareMinor: 600,
        createdAt: now,
        updatedAt: now,
      },
    ])
);

run(
  "Create manual cash settlement",
  `db.settlements.insertOne({
  fromMembershipId,
  toMembershipId,
  amountMinor: 1000,
  method: "cash"
})`,
  () =>
    demoDb.settlements.insertOne({
      _id: settlementId,
      groupId: goaTripGroupId,
      fromMembershipId: aishaGoaMembershipId,
      toMembershipId: rahulGoaMembershipId,
      amountMinor: 1000,
      currency: "INR",
      method: "cash",
      note: "Partial cash settlement after dinner",
      createdByUserId: aishaUserId,
      settledAt: now,
      createdAt: now,
      updatedAt: now,
    })
);

run(
  "Create activity log entries",
  `db.activitylogs.insertMany([
  { actionType: "group_created", ... },
  { actionType: "member_invited", ... },
  { actionType: "expense_added", ... },
  { actionType: "settlement_recorded", ... }
])`,
  () =>
    demoDb.activitylogs.insertMany([
      {
        groupId: goaTripGroupId,
        actorUserId: rahulUserId,
        entityType: "group",
        entityId: goaTripGroupId,
        actionType: "group_created",
        metadata: {
          name: "Goa Trip",
          type: "group",
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        groupId: goaTripGroupId,
        actorUserId: rahulUserId,
        entityType: "invitation",
        entityId: invitationId,
        actionType: "member_invited",
        metadata: {
          email: "sameer.demo@example.com",
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        groupId: goaTripGroupId,
        actorUserId: rahulUserId,
        entityType: "expense",
        entityId: dinnerExpenseId,
        actionType: "expense_added",
        metadata: {
          title: "Dinner",
          amountMinor: 1500,
          splitMethod: "equal",
        },
        createdAt: now,
        updatedAt: now,
      },
      {
        groupId: goaTripGroupId,
        actorUserId: aishaUserId,
        entityType: "settlement",
        entityId: settlementId,
        actionType: "settlement_recorded",
        metadata: {
          amountMinor: 1000,
          method: "cash",
        },
        createdAt: now,
        updatedAt: now,
      },
    ])
);

run(
  "Create notifications including one temporary notification for delete demo",
  `db.notifications.insertMany([
  { type: "expense_added", deliveryChannels: { inApp: true, email: false }, ... },
  { title: "Temporary demo notification to delete", ... }
])`,
  () =>
    demoDb.notifications.insertMany([
      {
        userId: aishaUserId,
        groupId: goaTripGroupId,
        type: "expense_added",
        entityType: "expense",
        entityId: dinnerExpenseId,
        title: "New expense in Goa Trip",
        body: "Rahul added Dinner",
        isRead: false,
        readAt: null,
        deliveryChannels: {
          inApp: true,
          email: false,
        },
        emailStatus: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        userId: rahulUserId,
        groupId: goaTripGroupId,
        type: "settlement_recorded",
        entityType: "settlement",
        entityId: settlementId,
        title: "Settlement recorded",
        body: "Aisha recorded a cash settlement",
        isRead: false,
        readAt: null,
        deliveryChannels: {
          inApp: true,
          email: false,
        },
        emailStatus: null,
        createdAt: now,
        updatedAt: now,
      },
      {
        userId: rahulUserId,
        groupId: goaTripGroupId,
        type: "expense_added",
        entityType: "expense",
        entityId: dinnerExpenseId,
        title: "Temporary demo notification to delete",
        body: "This notification exists only to demonstrate deleteOne.",
        isRead: false,
        readAt: null,
        deliveryChannels: {
          inApp: true,
          email: false,
        },
        emailStatus: null,
        createdAt: now,
        updatedAt: now,
      },
    ])
);

section("3. READ QUERIES");

run(
  "Read users without exposing passwordHash",
  `db.users.find({}, {
  name: 1,
  email: 1,
  defaultCurrency: 1,
  notificationPreferences: 1,
  createdAt: 1
}).toArray()`,
  () =>
    demoDb.users
      .find(
        {},
        {
          name: 1,
          email: 1,
          defaultCurrency: 1,
          notificationPreferences: 1,
          createdAt: 1,
        }
      )
      .toArray()
);

run(
  "Read groups and direct ledgers",
  `db.groups.find({}, {
  name: 1,
  type: 1,
  defaultCurrency: 1,
  simplifyDebts: 1,
  status: 1
}).toArray()`,
  () =>
    demoDb.groups
      .find(
        {},
        {
          name: 1,
          type: 1,
          defaultCurrency: 1,
          simplifyDebts: 1,
          status: 1,
        }
      )
      .toArray()
);

run(
  "Read active and pending group memberships",
  `db.memberships.find({ groupId: goaTripGroupId }, {
  status: 1,
  userId: 1,
  invitationId: 1,
  emailSnapshot: 1,
  cachedNetBalanceMinor: 1
}).toArray()`,
  () =>
    demoDb.memberships
      .find(
        { groupId: goaTripGroupId },
        {
          status: 1,
          userId: 1,
          invitationId: 1,
          emailSnapshot: 1,
          cachedNetBalanceMinor: 1,
        }
      )
      .toArray()
);

run(
  "Read active expenses sorted by date",
  `db.expenses.find({ groupId: goaTripGroupId, isDeleted: false }, {
  title: 1,
  amountMinor: 1,
  splitMethod: 1,
  dateIncurred: 1,
  isDeleted: 1
}).sort({ dateIncurred: -1 }).toArray()`,
  () =>
    demoDb.expenses
      .find(
        { groupId: goaTripGroupId, isDeleted: false },
        {
          title: 1,
          amountMinor: 1,
          splitMethod: 1,
          dateIncurred: 1,
          isDeleted: 1,
        }
      )
      .sort({ dateIncurred: -1 })
      .toArray()
);

run(
  "Read split rows for Dinner expense",
  `db.splits.find({ expenseId: dinnerExpenseId }, {
  membershipId: 1,
  inputType: 1,
  inputValue: 1,
  owedShareMinor: 1
}).toArray()`,
  () =>
    demoDb.splits
      .find(
        { expenseId: dinnerExpenseId },
        {
          membershipId: 1,
          inputType: 1,
          inputValue: 1,
          owedShareMinor: 1,
        }
      )
      .toArray()
);

section("4. FILTER, SEARCH, EMBEDDED DOCUMENT, AND ARRAY QUERIES");

run(
  "Project search/filter query using $or and $regex",
  `db.expenses.find({
  groupId: goaTripGroupId,
  isDeleted: false,
  $or: [
    { title: { $regex: "dinner", $options: "i" } },
    { notes: { $regex: "dinner", $options: "i" } }
  ]
}).toArray()`,
  () =>
    demoDb.expenses
      .find({
        groupId: goaTripGroupId,
        isDeleted: false,
        $or: [
          { title: { $regex: "dinner", $options: "i" } },
          { notes: { $regex: "dinner", $options: "i" } },
        ],
      })
      .toArray()
);

run(
  "Comparison and logical operators using $and, $gte, and $in",
  `db.expenses.find({
  $and: [
    { groupId: goaTripGroupId },
    { amountMinor: { $gte: 1000 } },
    { splitMethod: { $in: ["equal", "exact", "percent", "shares"] } }
  ]
}).toArray()`,
  () =>
    demoDb.expenses
      .find({
        $and: [
          { groupId: goaTripGroupId },
          { amountMinor: { $gte: 1000 } },
          { splitMethod: { $in: ["equal", "exact", "percent", "shares"] } },
        ],
      })
      .toArray()
);

run(
  "Embedded document query using dot notation",
  `db.users.find({
  "notificationPreferences.emailEnabled": true
}, {
  name: 1,
  email: 1,
  notificationPreferences: 1
}).toArray()`,
  () =>
    demoDb.users
      .find(
        { "notificationPreferences.emailEnabled": true },
        {
          name: 1,
          email: 1,
          notificationPreferences: 1,
        }
      )
      .toArray()
);

run(
  "Embedded document query on notification deliveryChannels",
  `db.notifications.find({
  "deliveryChannels.inApp": true
}, {
  title: 1,
  body: 1,
  deliveryChannels: 1,
  isRead: 1
}).toArray()`,
  () =>
    demoDb.notifications
      .find(
        { "deliveryChannels.inApp": true },
        {
          title: 1,
          body: 1,
          deliveryChannels: 1,
          isRead: 1,
        }
      )
      .toArray()
);

run(
  "Add an activity log with metadata.changedFields array",
  `db.activitylogs.insertOne({
  actionType: "expense_edited",
  metadata: {
    changedFields: ["title", "notes"]
  }
})`,
  () =>
    demoDb.activitylogs.insertOne({
      groupId: goaTripGroupId,
      actorUserId: rahulUserId,
      entityType: "expense",
      entityId: dinnerExpenseId,
      actionType: "expense_edited",
      metadata: {
        before: {
          title: "Dinner",
          notes: "Equal split dinner expense",
        },
        after: {
          title: "Dinner at Baga Beach",
          notes: "Edited demo expense",
        },
        changedFields: ["title", "notes"],
      },
      createdAt: now,
      updatedAt: now,
    })
);

run(
  "Array query using $all on metadata.changedFields",
  `db.activitylogs.find({
  "metadata.changedFields": { $all: ["title", "notes"] }
}).toArray()`,
  () =>
    demoDb.activitylogs
      .find({
        "metadata.changedFields": { $all: ["title", "notes"] },
      })
      .toArray()
);

run(
  "Array query using $size on metadata.changedFields",
  `db.activitylogs.find({
  "metadata.changedFields": { $size: 2 }
}).toArray()`,
  () =>
    demoDb.activitylogs
      .find({
        "metadata.changedFields": { $size: 2 },
      })
      .toArray()
);

section("5. UPDATE QUERIES");

run(
  "Accept pending invite by updating membership",
  `db.memberships.updateOne(
  { _id: sameerGoaMembershipId },
  {
    $set: {
      userId: sameerUserId,
      status: "active",
      joinedAt: now
    }
  }
)`,
  () =>
    demoDb.memberships.updateOne(
      { _id: sameerGoaMembershipId },
      {
        $set: {
          userId: sameerUserId,
          status: "active",
          joinedAt: now,
          updatedAt: now,
        },
      }
    )
);

run(
  "Mark invitation as accepted",
  `db.invitations.updateOne(
  { _id: invitationId },
  {
    $set: {
      status: "accepted",
      acceptedAt: now
    }
  }
)`,
  () =>
    demoDb.invitations.updateOne(
      { _id: invitationId },
      {
        $set: {
          status: "accepted",
          acceptedAt: now,
          updatedAt: now,
        },
      }
    )
);

run(
  "Verify invite acceptance result",
  `db.memberships.find({ _id: sameerGoaMembershipId }, {
  status: 1,
  userId: 1,
  invitationId: 1,
  joinedAt: 1
}).toArray()`,
  () =>
    demoDb.memberships
      .find(
        { _id: sameerGoaMembershipId },
        {
          status: 1,
          userId: 1,
          invitationId: 1,
          joinedAt: 1,
        }
      )
      .toArray()
);

run(
  "Edit expense using $set, $inc, and $currentDate",
  `db.expenses.updateOne(
  { _id: dinnerExpenseId },
  {
    $set: {
      title: "Dinner at Baga Beach",
      notes: "Edited demo expense"
    },
    $inc: { version: 1 },
    $currentDate: { updatedAt: true }
  }
)`,
  () =>
    demoDb.expenses.updateOne(
      { _id: dinnerExpenseId },
      {
        $set: {
          title: "Dinner at Baga Beach",
          notes: "Edited demo expense",
        },
        $inc: {
          version: 1,
        },
        $currentDate: {
          updatedAt: true,
        },
      }
    )
);

run(
  "Verify edited expense",
  `db.expenses.find({ _id: dinnerExpenseId }, {
  title: 1,
  notes: 1,
  version: 1,
  updatedAt: 1
}).toArray()`,
  () =>
    demoDb.expenses
      .find(
        { _id: dinnerExpenseId },
        {
          title: 1,
          notes: 1,
          version: 1,
          updatedAt: 1,
        }
      )
      .toArray()
);

run(
  "Soft delete expense using $set and $inc",
  `db.expenses.updateOne(
  { _id: cabExpenseId },
  {
    $set: {
      isDeleted: true,
      deletedAt: now,
      deletedByUserId: rahulUserId
    },
    $inc: { version: 1 }
  }
)`,
  () =>
    demoDb.expenses.updateOne(
      { _id: cabExpenseId },
      {
        $set: {
          isDeleted: true,
          deletedAt: now,
          deletedByUserId: rahulUserId,
          updatedAt: now,
        },
        $inc: {
          version: 1,
        },
      }
    )
);

run(
  "Verify soft-deleted expense",
  `db.expenses.find({ _id: cabExpenseId }, {
  title: 1,
  isDeleted: 1,
  deletedAt: 1,
  deletedByUserId: 1,
  version: 1
}).toArray()`,
  () =>
    demoDb.expenses
      .find(
        { _id: cabExpenseId },
        {
          title: 1,
          isDeleted: 1,
          deletedAt: 1,
          deletedByUserId: 1,
          version: 1,
        }
      )
      .toArray()
);

run(
  "Restore soft-deleted expense",
  `db.expenses.updateOne(
  { _id: cabExpenseId },
  {
    $set: {
      isDeleted: false,
      deletedAt: null,
      deletedByUserId: null
    },
    $inc: { version: 1 }
  }
)`,
  () =>
    demoDb.expenses.updateOne(
      { _id: cabExpenseId },
      {
        $set: {
          isDeleted: false,
          deletedAt: null,
          deletedByUserId: null,
          updatedAt: now,
        },
        $inc: {
          version: 1,
        },
      }
    )
);

run(
  "Verify restored expense",
  `db.expenses.find({ _id: cabExpenseId }, {
  title: 1,
  isDeleted: 1,
  deletedAt: 1,
  deletedByUserId: 1,
  version: 1
}).toArray()`,
  () =>
    demoDb.expenses
      .find(
        { _id: cabExpenseId },
        {
          title: 1,
          isDeleted: 1,
          deletedAt: 1,
          deletedByUserId: 1,
          version: 1,
        }
      )
      .toArray()
);

run(
  "Mark notifications as read using updateMany",
  `db.notifications.updateMany(
  { userId: rahulUserId, isRead: false },
  {
    $set: {
      isRead: true,
      readAt: now
    }
  }
)`,
  () =>
    demoDb.notifications.updateMany(
      { userId: rahulUserId, isRead: false },
      {
        $set: {
          isRead: true,
          readAt: now,
          updatedAt: now,
        },
      }
    )
);

section("6. DELETE QUERY");

run(
  "Delete only the temporary demo notification",
  `db.notifications.deleteOne({
  title: "Temporary demo notification to delete"
})`,
  () =>
    demoDb.notifications.deleteOne({
      title: "Temporary demo notification to delete",
    })
);

run(
  "Verify temporary notification was deleted",
  `db.notifications.find({
  title: "Temporary demo notification to delete"
}).toArray()`,
  () =>
    demoDb.notifications
      .find({
        title: "Temporary demo notification to delete",
      })
      .toArray()
);

section("7. INDEX VERIFICATION AND EXPLAIN");

run(
  "Show expense indexes",
  `db.expenses.getIndexes()`,
  () => demoDb.expenses.getIndexes()
);

run(
  "Explain indexed expense query",
  `db.expenses.find({
  groupId: goaTripGroupId,
  isDeleted: false
}).sort({ dateIncurred: -1 }).explain("executionStats")`,
  () => {
    const explanation = demoDb.expenses
      .find({
        groupId: goaTripGroupId,
        isDeleted: false,
      })
      .sort({ dateIncurred: -1 })
      .explain("executionStats");

    return {
      executionSuccess: explanation.executionStats.executionSuccess,
      nReturned: explanation.executionStats.nReturned,
      totalKeysExamined: explanation.executionStats.totalKeysExamined,
      totalDocsExamined: explanation.executionStats.totalDocsExamined,
      executionTimeMillis: explanation.executionStats.executionTimeMillis,
      winningPlan: explanation.queryPlanner.winningPlan,
    };
  }
);

section("8. AGGREGATION QUERIES");

run(
  "Aggregation: group expense totals by split method",
  `db.expenses.aggregate([
  { $match: { groupId: goaTripGroupId } },
  {
    $group: {
      _id: "$splitMethod",
      expenseCount: { $sum: 1 },
      totalAmountMinor: { $sum: "$amountMinor" },
      activeExpenseCount: {
        $sum: {
          $cond: [{ $eq: ["$isDeleted", false] }, 1, 0]
        }
      },
      deletedExpenseCount: {
        $sum: {
          $cond: [{ $eq: ["$isDeleted", true] }, 1, 0]
        }
      }
    }
  },
  { $sort: { _id: 1 } }
]).toArray()`,
  () =>
    demoDb.expenses
      .aggregate([
        {
          $match: {
            groupId: goaTripGroupId,
          },
        },
        {
          $group: {
            _id: "$splitMethod",
            expenseCount: {
              $sum: 1,
            },
            totalAmountMinor: {
              $sum: "$amountMinor",
            },
            activeExpenseCount: {
              $sum: {
                $cond: [{ $eq: ["$isDeleted", false] }, 1, 0],
              },
            },
            deletedExpenseCount: {
              $sum: {
                $cond: [{ $eq: ["$isDeleted", true] }, 1, 0],
              },
            },
          },
        },
        {
          $sort: {
            _id: 1,
          },
        },
      ])
      .toArray()
);

run(
  "Aggregation: total settlements for group",
  `db.settlements.aggregate([
  { $match: { groupId: goaTripGroupId } },
  {
    $group: {
      _id: "$groupId",
      settlementCount: { $sum: 1 },
      settlementTotalMinor: { $sum: "$amountMinor" }
    }
  }
]).toArray()`,
  () =>
    demoDb.settlements
      .aggregate([
        {
          $match: {
            groupId: goaTripGroupId,
          },
        },
        {
          $group: {
            _id: "$groupId",
            settlementCount: {
              $sum: 1,
            },
            settlementTotalMinor: {
              $sum: "$amountMinor",
            },
          },
        },
      ])
      .toArray()
);

run(
  "Aggregation: activity count by actionType",
  `db.activitylogs.aggregate([
  { $match: { groupId: goaTripGroupId } },
  {
    $group: {
      _id: "$actionType",
      count: { $sum: 1 }
    }
  },
  { $sort: { count: -1 } }
]).toArray()`,
  () =>
    demoDb.activitylogs
      .aggregate([
        {
          $match: {
            groupId: goaTripGroupId,
          },
        },
        {
          $group: {
            _id: "$actionType",
            count: {
              $sum: 1,
            },
          },
        },
        {
          $sort: {
            count: -1,
          },
        },
      ])
      .toArray()
);

section("9. FINAL DATABASE SUMMARY");

run(
  "Show collections in demo database",
  `db.getSiblingDB("${DEMO_DB_NAME}").getCollectionNames()`,
  () => demoDb.getCollectionNames()
);

run(
  "Show document counts per collection",
  `{
  users: db.users.countDocuments(),
  groups: db.groups.countDocuments(),
  memberships: db.memberships.countDocuments(),
  invitations: db.invitations.countDocuments(),
  expenses: db.expenses.countDocuments(),
  splits: db.splits.countDocuments(),
  settlements: db.settlements.countDocuments(),
  notifications: db.notifications.countDocuments(),
  activitylogs: db.activitylogs.countDocuments()
}`,
  () => ({
    users: demoDb.users.countDocuments(),
    groups: demoDb.groups.countDocuments(),
    memberships: demoDb.memberships.countDocuments(),
    invitations: demoDb.invitations.countDocuments(),
    expenses: demoDb.expenses.countDocuments(),
    splits: demoDb.splits.countDocuments(),
    settlements: demoDb.settlements.countDocuments(),
    notifications: demoDb.notifications.countDocuments(),
    activitylogs: demoDb.activitylogs.countDocuments(),
  })
);

if (CLEANUP_AT_END) {
  section("10. CLEANUP");
  run(
    "Drop demo database at end",
    `db.getSiblingDB("${DEMO_DB_NAME}").dropDatabase()`,
    () => demoDb.dropDatabase()
  );
} else {
  section("10. CLEANUP SKIPPED");
  print("CLEANUP_AT_END is false.");
  print(`Demo database '${DEMO_DB_NAME}' is kept so you can inspect it in mongosh or MongoDB Compass.`);
  print("To remove it later, run:");
  print(`mongosh --eval 'db.getSiblingDB("${DEMO_DB_NAME}").dropDatabase()'`);
}