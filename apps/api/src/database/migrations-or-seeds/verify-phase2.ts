import 'reflect-metadata';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection, Types } from 'mongoose';

import { AppModule } from '../../app.module';

const REQUIRED_COLLECTIONS = [
  'users',
  'groups',
  'memberships',
  'invitations',
  'expenses',
  'splits',
  'settlements',
  'notifications',
  'activitylogs',
] as const;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function objectIdString(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'toString' in value &&
    typeof (value as Types.ObjectId).toString === 'function'
  ) {
    return (value as Types.ObjectId).toString();
  }

  return null;
}

async function run(): Promise<void> {
  const logger = new Logger('Phase2Verify');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  try {
    const connection = app.get<Connection>(getConnectionToken());

assert(connection.db, 'Mongo database connection is not available.');

const existingCollections = new Set(
  (await connection.db.listCollections().toArray()).map(
    (collection) => collection.name,
  ),
);

    for (const name of REQUIRED_COLLECTIONS) {
      assert(existingCollections.has(name), `Missing collection: ${name}`);
    }

    const pendingMembership = await connection.collection('memberships').findOne({
      status: 'pending',
    });

    assert(pendingMembership, 'Expected one pending membership.');
    assert(
      pendingMembership.userId == null,
      'Pending membership must have userId = null.',
    );
    assert(
      pendingMembership.invitationId != null,
      'Pending membership must keep invitationId.',
    );

    const invitation = await connection.collection('invitations').findOne({
      _id: pendingMembership.invitationId,
    });

    assert(invitation, 'Expected invitation linked to pending membership.');

    const invitationMembershipId = objectIdString(invitation.membershipId);
    const pendingMembershipId = objectIdString(pendingMembership._id);

    assert(
      invitationMembershipId === pendingMembershipId,
      'Invitation.membershipId must point to the same pending membership.',
    );

    const expense = await connection.collection('expenses').findOne({});
    assert(expense, 'Expected one seeded expense.');

    const payerMembership = await connection.collection('memberships').findOne({
      _id: expense.payerMembershipId,
    });

    assert(
      payerMembership,
      'Expense.payerMembershipId must point to a membership.',
    );

    const split = await connection.collection('splits').findOne({});
    assert(split, 'Expected one seeded split.');

    const splitMembership = await connection.collection('memberships').findOne({
      _id: split.membershipId,
    });

    assert(
      splitMembership,
      'Split.membershipId must point to a membership.',
    );

    const settlement = await connection.collection('settlements').findOne({});
    assert(settlement, 'Expected one seeded settlement.');

    const settlementFromMembership = await connection
      .collection('memberships')
      .findOne({
        _id: settlement.fromMembershipId,
      });

    const settlementToMembership = await connection
      .collection('memberships')
      .findOne({
        _id: settlement.toMembershipId,
      });

    assert(
      settlementFromMembership,
      'Settlement.fromMembershipId must point to a membership.',
    );
    assert(
      settlementToMembership,
      'Settlement.toMembershipId must point to a membership.',
    );

    const directGroup = await connection.collection('groups').findOne({
      type: 'direct',
    });

    assert(directGroup, 'Expected one direct group in seed data.');

    const directMembershipCount = await connection
      .collection('memberships')
      .countDocuments({
        groupId: directGroup._id,
        status: 'active',
      });

    assert(
      directMembershipCount === 2,
      'Seeded direct group must have exactly 2 active memberships.',
    );

    logger.log('Phase 2 verification passed.');
  } finally {
    await app.close();
  }
}

void run();