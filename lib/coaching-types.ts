export type TransportMode = "car" | "train";

export type CoachingEntry = {
  date: string; // "YYYY-MM-DD"
  transport: TransportMode;
  parkedAtLot: boolean; // only meaningful when transport === "car"
};
