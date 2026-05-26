import type { BuiltinToolManifest } from '@lobechat/types';

import { systemPrompt } from './systemRole';
import { TeamBuilderApiName, TeamBuilderIdentifier } from './types';

export const TeamBuilderManifest: BuiltinToolManifest = {
  api: [
    {
      description:
        'Propose a team plan with members, tasks, and evaluation criteria based on the user requirement analysis. This always requires user approval before execution.',
      humanIntervention: 'required',
      name: TeamBuilderApiName.proposeTeamPlan,
      parameters: {
        properties: {
          analysis: {
            description: 'Your detailed analysis of the user requirement',
            type: 'string',
          },
          evaluationCriteria: {
            description: 'Evaluation criteria to assess completion',
            items: {
              properties: {
                criterion: { description: 'What to evaluate', type: 'string' },
                measurement: { description: 'How to measure', type: 'string' },
                threshold: { description: 'Pass threshold', type: 'string' },
                weight: { description: 'Weight (0-1)', type: 'number' },
              },
              required: ['criterion', 'measurement', 'threshold', 'weight'],
              type: 'object',
            },
            type: 'array',
          },
          members: {
            description: 'Proposed team members',
            items: {
              properties: {
                avatar: {
                  description: 'Single emoji representing the role',
                  type: 'string',
                },
                rationale: {
                  description: 'Why this role is needed',
                  type: 'string',
                },
                systemRole: {
                  description: 'System prompt for this team member',
                  type: 'string',
                },
                title: { description: 'Role name', type: 'string' },
                tools: {
                  description: 'Suggested tool identifiers',
                  items: { type: 'string' },
                  type: 'array',
                },
              },
              required: ['title', 'avatar', 'rationale', 'systemRole'],
              type: 'object',
            },
            type: 'array',
          },
          strategy: {
            description: 'Overall strategy for completing the requirement',
            type: 'string',
          },
          tasks: {
            description: 'Task breakdown with assignments',
            items: {
              properties: {
                assigneeTitle: {
                  description: 'Title of the member assigned to this task',
                  type: 'string',
                },
                dependsOn: {
                  description: 'Names of tasks this depends on',
                  items: { type: 'string' },
                  type: 'array',
                },
                instruction: {
                  description: 'Detailed task instruction',
                  type: 'string',
                },
                name: { description: 'Task name', type: 'string' },
                priority: {
                  description: 'Priority (1=critical, 2=important, 3=nice-to-have)',
                  type: 'number',
                },
                sortOrder: {
                  description: 'Execution order',
                  type: 'number',
                },
              },
              required: ['name', 'instruction', 'assigneeTitle', 'sortOrder'],
              type: 'object',
            },
            type: 'array',
          },
        },
        required: ['analysis', 'strategy', 'members', 'tasks', 'evaluationCriteria'],
        type: 'object',
      },
    },
  ],
  identifier: TeamBuilderIdentifier,
  meta: { avatar: '🏗️', title: 'Team Builder' },
  systemRole: systemPrompt,
  type: 'builtin',
};
