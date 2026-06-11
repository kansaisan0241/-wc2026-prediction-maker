export type GroupId =
  | "A"
  | "B"
  | "C"
  | "D"
  | "E"
  | "F"
  | "G"
  | "H"
  | "I"
  | "J"
  | "K"
  | "L";

export type RoundId = "r32" | "r16" | "qf" | "sf" | "final";

export type Team = {
  id: string;
  name: string;
  group: GroupId;
  flagCode: string;
};

export type GroupRankings = Record<GroupId, Team[]>;

export type DirectSeed = {
  kind: "direct";
  group: GroupId;
  rank: 1 | 2;
};

export type ThirdSeed = {
  kind: "third";
  slotId: string;
  groups: GroupId[];
};

export type WinnerSeed = {
  kind: "winner";
  round: RoundId;
  matchIndex: number;
};

export type Seed = DirectSeed | ThirdSeed | WinnerSeed;

export type Match = {
  id: string;
  round: RoundId;
  label: string;
  left: Seed;
  right: Seed;
};

export type PredictionState = {
  groupRankings: GroupRankings;
  thirdSelections: Record<string, GroupId | "">;
  winners: Record<string, "left" | "right" | "">;
};
