import type { TeamConfig, TeamPlan, TeamStatus } from '@lobechat/types';

import type { ChatGroupState } from '../initialState';

const getTeamConfig =
  (groupId: string) =>
  (state: ChatGroupState): TeamConfig | undefined => {
    const group = state.groupMap[groupId];
    if (!group) return undefined;
    const config = group.config as Record<string, any> | undefined;
    return config?.team as TeamConfig | undefined;
  };

export const teamSelectors = {
  isTeamGroup:
    (groupId: string) =>
    (state: ChatGroupState): boolean => {
      return !!getTeamConfig(groupId)(state);
    },

  teamPlan:
    (groupId: string) =>
    (state: ChatGroupState): TeamPlan | undefined => {
      return getTeamConfig(groupId)(state)?.plan;
    },

  teamStatus:
    (groupId: string) =>
    (state: ChatGroupState): TeamStatus | undefined => {
      return getTeamConfig(groupId)(state)?.status;
    },

  teamProgress:
    (groupId: string) =>
    (state: ChatGroupState): number => {
      const plan = getTeamConfig(groupId)(state)?.plan;
      if (!plan) return 0;

      const total = plan.members.length + plan.tasks.length;
      if (total === 0) return 0;

      const approvedMembers = plan.members.filter((m) => m.approved).length;
      const memberProgress = approvedMembers / plan.members.length;

      return memberProgress * (plan.members.length / total);
    },
};
