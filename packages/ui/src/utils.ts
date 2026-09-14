// Re-export from portable-kanban-core for backward compatibility
export * from 'portable-kanban-core';

import { getCardUid, type Card } from 'portable-kanban-core';

// Short, human-readable tag for a card's uid, e.g. "#a1b2c3d4".
export const formatCardTag = (card: Card): string => `#${getCardUid(card).slice(0, 8)}`;
