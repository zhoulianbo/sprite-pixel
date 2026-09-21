export const gameGenreValues = [
  'action_rpg',
  'roguelike',
  'platformer',
  'adventure',
  'strategy',
  'casual',
  'other',
] as const;

export type GameGenre = (typeof gameGenreValues)[number];
