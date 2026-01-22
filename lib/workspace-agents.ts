/**
 * Agent IDs that are duplicated when creating a new workspace
 * These agents are copied from the source workspace to each new client workspace
 */

export interface WorkspaceAgent {
  id: string;
  category: string;
  name?: string; // Will be added later
}

export const WORKSPACE_AGENTS: WorkspaceAgent[] = [
  // Prospector Agent
  {
    id: 'ca_0EQ3oCpNpE8VubFBIUmYm',
    category: 'Prospector',
  },
  
  // Cold Email Sequence Agents (5)
  {
    id: 'ca_6ghm6GTyTCtQjUibRJYBn',
    category: 'Cold Email',
  },
  {
    id: 'ca_70c4EJDSrPykuWgMGJreP',
    category: 'Cold Email',
  },
  {
    id: 'ca_6E1kFGKeALMz64F7SMB0c',
    category: 'Cold Email',
  },
  {
    id: 'ca_NJM0OZjyBbMn1cDTDIoVl',
    category: 'Cold Email',
  },
  {
    id: 'ca_MaQ3TezxYsMJvkpGnDMDS',
    category: 'Cold Email',
  },
  
  // Call Prep Agent
  {
    id: 'ca_BLZTE6PKlqVEAK1ZFarmR',
    category: 'Call Prep',
  },
  
  // LinkedIn Post Agents (3)
  {
    id: 'ca_B6JBf44OqaZA5cdhJ1z6P',
    category: 'LinkedIn Post',
  },
  {
    id: 'ca_KdG0WncyW45oRqFZcdngQ',
    category: 'LinkedIn Post',
  },
  {
    id: 'ca_xfNTga6wQNUqfH45KM0Ka',
    category: 'LinkedIn Post',
  },
  
  // LinkedIn DM Agents (3)
  {
    id: 'ca_b4p8wuI4rntQdhoxK2hF7',
    category: 'LinkedIn DM',
  },
  {
    id: 'ca_Ea41BbpWV2HPlvLQiyyT4',
    category: 'LinkedIn DM',
  },
  {
    id: 'ca_mKHrB6A2yNiBN5yRPPsOm',
    category: 'LinkedIn DM',
  },
  
  // YouTube Script Agents
  {
    id: 'ca_oR6ro10L1z7N8HouxVgNc',
    category: 'YouTube Script',
  },
  
  // Newsletter Agents (2)
  {
    id: 'ca_e4UYXGTMitLjwZEgzsNc1',
    category: 'Newsletter',
  },
  {
    id: 'ca_gilixBObzhALpK7LO7Nr9',
    category: 'Newsletter',
  },
  
  // Additional agents to duplicate (but not run in Generate-Strategy)
  {
    id: 'ca_GMFhrclZrKlLenspxmf62',
    category: 'Additional',
  },
  {
    id: 'ca_uMdv2bkfb0KoOAyIA5llW',
    category: 'Additional',
  },
  
  // New agents to duplicate (added from original Workspace)
  {
    id: 'ca_c1qy7EuAXr8Z6TPujnycr',
    category: 'Additional',
  },
  {
    id: 'ca_Q2MtCQAuQCmHilPWUYpyr',
    category: 'Additional',
  },
  {
    id: 'ca_Udf2ldbDFTbhrNk0ZEbgR',
    category: 'Additional',
  },
  {
    id: 'ca_cOe6Ml9XvnsLzp2UU3wXY',
    category: 'Additional',
  },
  {
    id: 'ca_293ipaXQSPcGw6BNqLktN',
    category: 'Additional',
  },
  {
    id: 'ca_9QS0knPK30f3frXrJG5hP',
    category: 'Additional',
  },
  {
    id: 'ca_5Uri8yosNot38SOrvB7mM',
    category: 'Additional',
  },
  {
    id: 'ca_TuwbyP6Ky4eT1Rd9NiCOv',
    category: 'Additional',
  },
  {
    id: 'ca_d5o4UmytXj4n2Xf92Kj9S',
    category: 'Additional',
  },
  {
    id: 'ca_fMfG5nMQ0uvl3xOuEu10c',
    category: 'Additional',
  },
  {
    id: 'ca_2ihSlhWxvfDWltLI0euKA',
    category: 'Additional',
  },
  {
    id: 'ca_v9aP4t7Gtx9jSJxBypm0b',
    category: 'Additional',
  },
  {
    id: 'ca_vDfOaZUGV8p9M0G98ezcS',
    category: 'Additional',
  },
  {
    id: 'ca_TBAivqIcnNtBkEEawCZJr',
    category: 'Additional',
  },
  {
    id: 'ca_QLfXcw6DUR2GVmcf9Ke6z',
    category: 'Additional',
  },
];

/**
 * Get all agent IDs as a flat array (for use in workspace creation)
 */
export function getWorkspaceAgentIds(): string[] {
  return WORKSPACE_AGENTS.map(agent => agent.id);
}

/**
 * Get agents grouped by category
 */
export function getAgentsByCategory(): Record<string, WorkspaceAgent[]> {
  return WORKSPACE_AGENTS.reduce((acc, agent) => {
    if (!acc[agent.category]) {
      acc[agent.category] = [];
    }
    acc[agent.category].push(agent);
    return acc;
  }, {} as Record<string, WorkspaceAgent[]>);
}

