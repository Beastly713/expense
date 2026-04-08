/// <reference types="jest" />

import { validateMemberRemoval } from '../../../src/modules/balances';

describe('validateMemberRemoval', () => {
  it('allows removal when the member net balance is zero', () => {
    expect(() =>
      validateMemberRemoval(
        [
          { membershipId: 'mem_a', netBalanceMinor: 0 },
          { membershipId: 'mem_b', netBalanceMinor: 200 },
          { membershipId: 'mem_c', netBalanceMinor: -200 },
        ],
        'mem_a',
      ),
    ).not.toThrow();
  });

  it('rejects removal when the member has a positive net balance', () => {
    expect(() =>
      validateMemberRemoval(
        [
          { membershipId: 'mem_a', netBalanceMinor: 200 },
          { membershipId: 'mem_b', netBalanceMinor: -200 },
        ],
        'mem_a',
      ),
    ).toThrow('Member cannot be removed while net balance is non-zero.');
  });

  it('rejects removal when the member has a negative net balance', () => {
    expect(() =>
      validateMemberRemoval(
        [
          { membershipId: 'mem_a', netBalanceMinor: -200 },
          { membershipId: 'mem_b', netBalanceMinor: 200 },
        ],
        'mem_a',
      ),
    ).toThrow('Member cannot be removed while net balance is non-zero.');
  });

  it('allows pending memberships to be removed when their net balance is zero', () => {
    expect(() =>
      validateMemberRemoval(
        [
          { membershipId: 'mem_pending', netBalanceMinor: 0 },
          { membershipId: 'mem_active', netBalanceMinor: 0 },
        ],
        'mem_pending',
      ),
    ).not.toThrow();
  });

  it('rejects pending memberships with non-zero net balance', () => {
    expect(() =>
      validateMemberRemoval(
        [
          { membershipId: 'mem_pending', netBalanceMinor: -400 },
          { membershipId: 'mem_active', netBalanceMinor: 400 },
        ],
        'mem_pending',
      ),
    ).toThrow('Member cannot be removed while net balance is non-zero.');
  });

  it('rejects when the membership is missing from the net balance list', () => {
    expect(() =>
      validateMemberRemoval(
        [
          { membershipId: 'mem_a', netBalanceMinor: 0 },
          { membershipId: 'mem_b', netBalanceMinor: 0 },
        ],
        'mem_missing',
      ),
    ).toThrow('Membership not found in net balances: mem_missing.');
  });

  it('rejects duplicate membership rows in net balances', () => {
    expect(() =>
      validateMemberRemoval(
        [
          { membershipId: 'mem_a', netBalanceMinor: 0 },
          { membershipId: 'mem_a', netBalanceMinor: 0 },
        ],
        'mem_a',
      ),
    ).toThrow('Duplicate membershipId found: mem_a.');
  });
});