import { AI_DIFFICULTIES } from "../../ai";

export const MENU_OPTIONS = [
  {
    key: "single",
    icon: { family: "Ionicons", name: "person-outline" },
  },
  {
    key: "two-player",
    icon: { family: "Ionicons", name: "people-outline" },
  },
  {
    key: "online",
    icon: { family: "Ionicons", name: "globe-outline" },
  },
];

export const AI_THINK_DELAY = 420;
export const AI_MOVE_DELAY = 340;
export const ONLINE_MODE = MENU_OPTIONS.find((option) => option.key === "online");
export const WIN_SOUND_DEDUPE_MS = 1200;
export const MIN_SPLASH_MS = 3000;

export const AI_DIFFICULTY_OPTIONS = [
  { key: AI_DIFFICULTIES.EASY },
  { key: AI_DIFFICULTIES.NORMAL },
  { key: AI_DIFFICULTIES.HARD },
];

export const MOVE_SOUND = {
  MOVE: "move",
  CAPTURE: "capture",
  PROMOTE: "promote",
  WIN: "win",
};

export const MOVE_SOUND_SOURCE = {
  [MOVE_SOUND.MOVE]: require("../../assets/sounds/piece-move.wav"),
  [MOVE_SOUND.CAPTURE]: require("../../assets/sounds/piece-capture.wav"),
  [MOVE_SOUND.PROMOTE]: require("../../assets/sounds/piece-promote.wav"),
  [MOVE_SOUND.WIN]: require("../../assets/sounds/game-win.wav"),
};

export const APP_ICON_SOURCE = require("../../assets/app-icon.png");

export const CONFETTI_COLORS = [
  "#79dbc7",
  "#f4ca6f",
  "#ff8fa3",
  "#8bb8ff",
  "#ead2a2",
  "#dcfff6",
];

export const CONFETTI_PIECES = Array.from({ length: 28 }).map((_, index) => ({
  key: `confetti-${index}`,
  left: `${(index * 37) % 100}%`,
  delay: (index % 7) * 90,
  duration: 1350 + (index % 5) * 140,
  color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
  size: 7 + (index % 4) * 2,
  rotate: index % 2 === 0 ? "28deg" : "-32deg",
}));
