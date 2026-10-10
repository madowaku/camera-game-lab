export const GUARDIAN_SPIRITS = Object.freeze([
  { id: "warden", name: "WARDEN", ja: "蒼の守護騎士", en: "Sapphire protector", color: "#8edfff" },
  { id: "luna", name: "LUNA", ja: "月光の精霊", en: "Moonlight sovereign", color: "#dac4ff" },
  { id: "moss", name: "MOSS", ja: "森のちいさな守り神", en: "Little forest guardian", color: "#b9f78a" },
  { id: "kitsu", name: "KITSU", ja: "いたずら狐の精霊", en: "Mischievous fox spirit", color: "#ffbd82" },
].map((spirit) => Object.freeze({ ...spirit, atlas: `/artwork/guardian/${spirit.id}-parts-v1.webp` })));

export const guardianSpirit = (id) => GUARDIAN_SPIRITS.find((spirit) => spirit.id === id) ?? GUARDIAN_SPIRITS[0];
