import type { AspectRatio } from "@/types";

/** Value for the player's `data-ratio` attribute (matched by responsive-player.css). */
export const RATIO_ATTR: Record<AspectRatio, string> = {
  RATIO_16_9: "16-9",
  RATIO_9_16: "9-16",
  RATIO_4_3: "4-3",
  RATIO_1_1: "1-1",
};

export const RATIO_LABEL: Record<AspectRatio, string> = {
  RATIO_16_9: "16:9",
  RATIO_9_16: "9:16",
  RATIO_4_3: "4:3",
  RATIO_1_1: "1:1",
};
