import type { GroupId, GroupRankings, Match, PredictionState, Team } from "@/lib/types";

const GROUP_NAMES: Record<GroupId, string[]> = {
  A: ["メキシコ", "南アフリカ", "韓国", "チェコ"],
  B: ["カナダ", "ボスニア・H", "カタール", "スイス"],
  C: ["ブラジル", "モロッコ", "ハイチ", "スコットランド"],
  D: ["アメリカ", "パラグアイ", "オーストラリア", "トルコ"],
  E: ["ドイツ", "キュラソー", "コートジボワール", "エクアドル"],
  F: ["オランダ", "日本", "スウェーデン", "チュニジア"],
  G: ["ベルギー", "エジプト", "イラン", "ニュージーランド"],
  H: ["スペイン", "カーボベルデ", "サウジアラビア", "ウルグアイ"],
  I: ["フランス", "セネガル", "イラク", "ノルウェー"],
  J: ["アルゼンチン", "アルジェリア", "オーストリア", "ヨルダン"],
  K: ["ポルトガル", "DRコンゴ", "ウズベキスタン", "コロンビア"],
  L: ["イングランド", "クロアチア", "ガーナ", "パナマ"]
};

const FLAG_CODES: Record<string, string> = {
  メキシコ: "mx",
  南アフリカ: "za",
  韓国: "kr",
  チェコ: "cz",
  カナダ: "ca",
  "ボスニア・H": "ba",
  カタール: "qa",
  スイス: "ch",
  ブラジル: "br",
  モロッコ: "ma",
  ハイチ: "ht",
  スコットランド: "gb-sct",
  アメリカ: "us",
  パラグアイ: "py",
  オーストラリア: "au",
  トルコ: "tr",
  ドイツ: "de",
  キュラソー: "cw",
  コートジボワール: "ci",
  エクアドル: "ec",
  オランダ: "nl",
  日本: "jp",
  スウェーデン: "se",
  チュニジア: "tn",
  ベルギー: "be",
  エジプト: "eg",
  イラン: "ir",
  ニュージーランド: "nz",
  スペイン: "es",
  カーボベルデ: "cv",
  サウジアラビア: "sa",
  ウルグアイ: "uy",
  フランス: "fr",
  セネガル: "sn",
  イラク: "iq",
  ノルウェー: "no",
  アルゼンチン: "ar",
  アルジェリア: "dz",
  オーストリア: "at",
  ヨルダン: "jo",
  ポルトガル: "pt",
  DRコンゴ: "cd",
  ウズベキスタン: "uz",
  コロンビア: "co",
  イングランド: "gb-eng",
  クロアチア: "hr",
  ガーナ: "gh",
  パナマ: "pa"
};

export const groupIds = Object.keys(GROUP_NAMES) as GroupId[];

export function createInitialRankings(): GroupRankings {
  return groupIds.reduce((rankings, group) => {
    rankings[group] = GROUP_NAMES[group].map((name) => ({
      id: `${group}-${name}`,
      name,
      group,
      flagCode: FLAG_CODES[name]
    }));
    return rankings;
  }, {} as GroupRankings);
}

export function createInitialPrediction(): PredictionState {
  return {
    groupRankings: createInitialRankings(),
    thirdSelections: Object.fromEntries(thirdSlots.map((slot) => [slot.id, ""])),
    winners: {},
    mvp: "",
    topScorer: ""
  };
}

export function getFlagUrl(team: Team) {
  return `https://flagcdn.com/w80/${team.flagCode}.png`;
}

const third = (id: string, groups: GroupId[]) => ({ kind: "third" as const, slotId: id, groups });
const direct = (group: GroupId, rank: 1 | 2) => ({ kind: "direct" as const, group, rank });

export const round32Matches: Match[] = [
  { id: "r32-1", round: "r32", label: "R32-1", left: direct("E", 1), right: third("t1", ["A", "B", "C", "D", "F"]) },
  { id: "r32-2", round: "r32", label: "R32-2", left: direct("I", 1), right: third("t2", ["C", "D", "F", "G", "H"]) },
  { id: "r32-3", round: "r32", label: "R32-3", left: direct("A", 2), right: direct("B", 2) },
  { id: "r32-4", round: "r32", label: "R32-4", left: direct("F", 1), right: direct("C", 2) },
  { id: "r32-5", round: "r32", label: "R32-5", left: direct("K", 2), right: direct("L", 2) },
  { id: "r32-6", round: "r32", label: "R32-6", left: direct("H", 1), right: direct("J", 2) },
  { id: "r32-7", round: "r32", label: "R32-7", left: direct("D", 1), right: third("t3", ["B", "E", "F", "I", "J"]) },
  { id: "r32-8", round: "r32", label: "R32-8", left: direct("G", 1), right: third("t4", ["A", "E", "H", "I", "J"]) },
  { id: "r32-9", round: "r32", label: "R32-9", left: direct("C", 1), right: direct("F", 2) },
  { id: "r32-10", round: "r32", label: "R32-10", left: direct("E", 2), right: direct("I", 2) },
  { id: "r32-11", round: "r32", label: "R32-11", left: direct("A", 1), right: third("t5", ["C", "E", "F", "H", "I"]) },
  { id: "r32-12", round: "r32", label: "R32-12", left: direct("L", 1), right: third("t6", ["E", "H", "I", "J", "K"]) },
  { id: "r32-13", round: "r32", label: "R32-13", left: direct("J", 1), right: direct("H", 2) },
  { id: "r32-14", round: "r32", label: "R32-14", left: direct("D", 2), right: direct("G", 2) },
  { id: "r32-15", round: "r32", label: "R32-15", left: direct("B", 1), right: third("t7", ["E", "F", "G", "I", "J"]) },
  { id: "r32-16", round: "r32", label: "R32-16", left: direct("K", 1), right: third("t8", ["D", "E", "I", "J", "L"]) }
];

export const thirdSlots = round32Matches
  .flatMap((match) => [match.left, match.right])
  .filter((seed) => seed.kind === "third")
  .map((seed) => ({ id: seed.slotId, groups: seed.groups }));

export const generatedRounds: Match[] = [
  ...Array.from({ length: 8 }, (_, i) => ({
    id: `r16-${i + 1}`,
    round: "r16" as const,
    label: `ベスト16-${i + 1}`,
    left: { kind: "winner" as const, round: "r32" as const, matchIndex: i * 2 },
    right: { kind: "winner" as const, round: "r32" as const, matchIndex: i * 2 + 1 }
  })),
  ...Array.from({ length: 4 }, (_, i) => ({
    id: `qf-${i + 1}`,
    round: "qf" as const,
    label: `ベスト8-${i + 1}`,
    left: { kind: "winner" as const, round: "r16" as const, matchIndex: i * 2 },
    right: { kind: "winner" as const, round: "r16" as const, matchIndex: i * 2 + 1 }
  })),
  ...Array.from({ length: 2 }, (_, i) => ({
    id: `sf-${i + 1}`,
    round: "sf" as const,
    label: `ベスト4-${i + 1}`,
    left: { kind: "winner" as const, round: "qf" as const, matchIndex: i * 2 },
    right: { kind: "winner" as const, round: "qf" as const, matchIndex: i * 2 + 1 }
  })),
  {
    id: "final-1",
    round: "final",
    label: "決勝",
    left: { kind: "winner", round: "sf", matchIndex: 0 },
    right: { kind: "winner", round: "sf", matchIndex: 1 }
  }
];

export const allMatches = [...round32Matches, ...generatedRounds];
