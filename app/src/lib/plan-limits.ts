export const PLAN_LIMITS = {
  free:    { conversation_credits: 100,   broadcast_credits: 0    },
  starter: { conversation_credits: 1000,  broadcast_credits: 500  },
  growth:  { conversation_credits: 5000,  broadcast_credits: 2000 },
  pro:     { conversation_credits: 99999, broadcast_credits: 9999 },
} as const;
