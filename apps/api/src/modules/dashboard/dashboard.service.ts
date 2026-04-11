import { Injectable } from '@nestjs/common';
import { GroupsRepository } from '../groups/groups.repository';
import { MembershipsRepository } from '../memberships/memberships.repository';

@Injectable()
export class DashboardService {
  constructor(
    private readonly membershipsRepository: MembershipsRepository,
    private readonly groupsRepository: GroupsRepository,
  ) {}

  async getSummary(currentUserId: string) {
    const activeMemberships =
      await this.membershipsRepository.findActiveByUserId(currentUserId);

    if (activeMemberships.length === 0) {
      return {
        totalYouOweMinor: 0,
        totalYouAreOwedMinor: 0,
        netBalanceMinor: 0,
        groupCount: 0,
        directLedgerCount: 0,
      };
    }

    let totalYouOweMinor = 0;
    let totalYouAreOwedMinor = 0;
    let netBalanceMinor = 0;

    for (const membership of activeMemberships) {
      const net = membership.cachedNetBalanceMinor ?? 0;

      netBalanceMinor += net;

      if (net < 0) {
        totalYouOweMinor += Math.abs(net);
      } else if (net > 0) {
        totalYouAreOwedMinor += net;
      }
    }

    const uniqueGroupIds = Array.from(
      new Set(activeMemberships.map((membership) => membership.groupId.toString())),
    );

    const groups = await this.groupsRepository.findByIds(uniqueGroupIds);

    const groupCount = groups.filter((group) => group.type === 'group').length;
    const directLedgerCount = groups.filter(
      (group) => group.type === 'direct',
    ).length;

    return {
      totalYouOweMinor,
      totalYouAreOwedMinor,
      netBalanceMinor,
      groupCount,
      directLedgerCount,
    };
  }
}