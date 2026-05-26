import type { TeamConfig, TeamPlan } from '@lobechat/types';

import { useClientDataSWR } from '@/libs/swr';
import { chatGroupService } from '@/services/chatGroup';
import type { ChatGroupStore } from '@/store/agentGroup/store';
import type { StoreSetter } from '@/store/types';
import { setNamespace } from '@/utils/storeDebug';

import type { ChatGroupState, TeamDetailTab } from '../initialState';

const n = setNamespace('chatGroup:team');

type Setter = StoreSetter<ChatGroupStore>;

export class TeamSliceAction {
  readonly #get: () => ChatGroupState;
  readonly #set: Setter;

  constructor(set: Setter, get: () => ChatGroupState, _api?: unknown) {
    void _api;

    this.#set = set;
    this.#get = get;
  }

  // ===== Navigation =====

  setTeamDetailTab = (tab: TeamDetailTab) => {
    this.#set({ teamDetailTab: tab }, false, n('setTeamDetailTab'));
  };

  // ===== Plan Review =====

  toggleMemberApproval = (groupId: string, memberTitle: string) => {
    const group = this.#get().groupMap[groupId];
    if (!group) return;

    const config = (group.config as Record<string, any>) || {};
    const teamConfig = config.team as TeamConfig | undefined;
    if (!teamConfig?.plan) return;

    const updatedMembers = teamConfig.plan.members.map((m) =>
      m.title === memberTitle ? { ...m, approved: !m.approved } : m,
    );

    const updatedPlan: TeamPlan = { ...teamConfig.plan, members: updatedMembers };

    this.#set(
      (state) => {
        const draft = { ...state };
        const groupDraft = { ...draft.groupMap[groupId] };
        const configDraft = { ...(groupDraft.config as Record<string, any>) };
        const teamDraft = { ...configDraft.team } as Record<string, any>;

        configDraft.team = { ...teamDraft, plan: updatedPlan };
        groupDraft.config = configDraft;
        draft.groupMap[groupId] = groupDraft as any;
        return draft;
      },
      false,
      n('toggleMemberApproval', { memberTitle }),
    );
  };

  // ===== Team Assembly =====

  approveTeamPlan = async (groupId: string) => {
    this.#set({ teamAssembling: true }, false, n('approveTeamPlan:start'));

    try {
      const result = await chatGroupService.approveTeamPlan(groupId);

      // Refresh group detail to get updated agents
      await chatGroupService.getGroupDetail(groupId);

      this.#set({ teamAssembling: false }, false, n('approveTeamPlan:done'));
      return result;
    } catch (error) {
      this.#set({ teamAssembling: false }, false, n('approveTeamPlan:error'));
      throw error;
    }
  };

  // ===== Data Fetching =====

  useFetchTeamStatus = (groupId: string, enabled: boolean) =>
    useClientDataSWR<TeamConfig | null>(
      enabled && groupId ? ['fetchTeamStatus', groupId] : null,
      () => chatGroupService.getTeamStatus(groupId),
    );
}
