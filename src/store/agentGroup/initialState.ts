import { type AgentGroupDetail } from '@lobechat/types';
import { type ParsedQuery } from 'query-string';

import { type ChatGroupItem } from '@/database/schemas/chatGroup';

export type TeamDetailTab = 'chat' | 'kanban' | 'timeline';

export interface QueryRouter {
  push: (url: string, options?: { query?: ParsedQuery; replace?: boolean }) => void;
}

export interface ChatGroupState {
  activeGroupId?: string;
  activeThreadAgentId: string;
  groupMap: Record<string, AgentGroupDetail>;
  groups: ChatGroupItem[];
  groupsInit: boolean;
  router?: QueryRouter;
  showGroupSetting: boolean;
  /**
   * Content being streamed for system prompt update (for GroupAgentBuilder)
   */
  streamingSystemPrompt?: string;
  /**
   * Whether system prompt streaming is in progress
   */
  streamingSystemPromptInProgress?: boolean;
  /**
   * Whether team assembly is in progress
   */
  teamAssembling: boolean;
  /**
   * Team detail page active tab
   */
  teamDetailTab: TeamDetailTab;
}

export const initialChatGroupState: ChatGroupState = {
  activeThreadAgentId: '',
  groupMap: {},
  groups: [],
  groupsInit: false,
  showGroupSetting: false,
  streamingSystemPrompt: undefined,
  streamingSystemPromptInProgress: false,
  teamAssembling: false,
  teamDetailTab: 'kanban',
};
