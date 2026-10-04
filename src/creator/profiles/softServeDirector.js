export const softServeDirectorProfile = Object.freeze({
  gameId: "soft-serve", gameNumber: 44, brand: "SOFT SERVE", heroEvent: "HERO",
  hookCandidates: ["NEAR_MISS", "BIG_SUCCESS", "FIRST_SUCCESS"],
  fallbackEvents: ["BIG_SUCCESS", "COMBO", "NEAR_MISS", "FAIL", "FIRST_SUCCESS", "FIRST_ACTION"],
  eventPriority: { HERO: 100, BIG_SUCCESS: 80, REACTION_WINDOW: 75, NEAR_MISS: 60, COMBO: 50 },
  reactionDuration: 3000, endCardDuration: 1500, bufferDuration: 12000,
  gameplayText: "TWIST!", heroLabel: "DELICIOUS!",
});
