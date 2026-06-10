"use client";

import { toPng } from "html-to-image";
import {
  ChevronDown,
  ChevronUp,
  Download,
  Moon,
  Play,
  RotateCcw,
  Save,
  Share2,
  Sun,
  Trophy,
  Upload
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { allMatches, createInitialPrediction, getFlagUrl, groupIds, thirdSlots } from "@/lib/data";
import { createShareUrl, readPredictionFromUrl, STORAGE_KEY } from "@/lib/storage";
import type { GroupId, Match, PredictionState, RoundId, Seed, Team } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

const roundLabels: Record<RoundId, string> = {
  r32: "ラウンド32",
  r16: "ベスト16",
  qf: "ベスト8",
  sf: "ベスト4",
  final: "決勝"
};

function reorder<T>(items: T[], from: number, to: number) {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function resolveSeed(seed: Seed, state: PredictionState, matchesByRound: Record<RoundId, Match[]>): Team | null {
  if (seed.kind === "direct") {
    return state.groupRankings[seed.group][seed.rank - 1] ?? null;
  }

  if (seed.kind === "third") {
    const group = state.thirdSelections[seed.slotId];
    return group ? state.groupRankings[group][2] ?? null : null;
  }

  const match = matchesByRound[seed.round][seed.matchIndex];
  if (!match) return null;
  const choice = state.winners[match.id];
  if (!choice) return null;
  return resolveSeed(match[choice], state, matchesByRound);
}

function TeamPill({ team, muted }: { team: Team | null; muted?: boolean }) {
  if (!team) {
    return <span className="text-sm font-semibold text-muted-foreground">未定</span>;
  }

  return (
    <span className={cn("flex min-w-0 items-center gap-2", muted && "opacity-60")}>
      <Image src={getFlagUrl(team)} alt={`${team.name} 国旗`} width={30} height={30} className="flag h-8 w-8 border border-border" />
      <span className="truncate text-sm font-bold">{team.name}</span>
    </span>
  );
}

function GroupCard({
  group,
  teams,
  onMove
}: {
  group: GroupId;
  teams: Team[];
  onMove: (group: GroupId, from: number, to: number) => void;
}) {
  const dragId = useRef<string | null>(null);

  const moveTeam = (from: number, delta: -1 | 1) => {
    const to = from + delta;
    if (to < 0 || to >= teams.length) return;
    onMove(group, from, to);
  };

  return (
    <Card id={`group-${group}`} className="overflow-hidden">
      <CardHeader className="bg-primary px-4 py-3 text-primary-foreground">
        <CardTitle>グループ{group}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 p-3">
        {teams.map((team, index) => (
          <div
            key={team.id}
            data-team-id={team.id}
            draggable
            onDragStart={() => {
              dragId.current = team.id;
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              const from = teams.findIndex((candidate) => candidate.id === dragId.current);
              if (from >= 0 && from !== index) onMove(group, from, index);
              dragId.current = null;
            }}
            onPointerDown={() => {
              dragId.current = team.id;
            }}
            onPointerUp={(event) => {
              const target = (event.target as HTMLElement).closest("[data-team-id]") as HTMLElement | null;
              const targetId = target?.dataset.teamId;
              const from = teams.findIndex((candidate) => candidate.id === dragId.current);
              const to = teams.findIndex((candidate) => candidate.id === targetId);
              if (from >= 0 && to >= 0 && from !== to) onMove(group, from, to);
              dragId.current = null;
            }}
            className="flex touch-none items-center gap-3 rounded-lg border border-border bg-background p-3 shadow-sm"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fifa text-sm font-black text-white">
              {index + 1}
            </div>
            <Image src={getFlagUrl(team)} alt={`${team.name} 国旗`} width={36} height={36} className="flag h-9 w-9 border border-border" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-base font-bold">{team.name}</div>
              <div className="text-xs text-muted-foreground">{index + 1}位予想</div>
            </div>
            <div className="flex flex-col gap-1">
              <Button size="icon" variant="ghost" aria-label="順位を上げる" disabled={index === 0} onClick={() => moveTeam(index, -1)}>
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" aria-label="順位を下げる" disabled={index === teams.length - 1} onClick={() => moveTeam(index, 1)}>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function ThirdPlacePicker({
  state,
  setState
}: {
  state: PredictionState;
  setState: React.Dispatch<React.SetStateAction<PredictionState>>;
}) {
  const usedGroups = new Set(Object.values(state.thirdSelections).filter(Boolean));

  return (
    <Card>
      <CardHeader>
        <CardTitle>3位通過チーム選択</CardTitle>
        <p className="text-sm text-muted-foreground">各枠で対象グループの3位チームを選択。選択済みチームは他枠で使えません。</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {thirdSlots.map((slot, index) => {
          const selected = state.thirdSelections[slot.id] || "";
          const options = slot.groups.map((group) => {
            const team = state.groupRankings[group][2];
            return {
              value: group,
              label: `${group}組3位 ${team.name}`,
              disabled: usedGroups.has(group) && selected !== group
            };
          });

          return (
            <div key={slot.id} className="rounded-lg border border-border bg-background p-3">
              <div className="mb-2 text-xs font-bold text-muted-foreground">3位枠 {index + 1}: {slot.groups.join("/")}組3位</div>
              <Select
                value={selected}
                placeholder="選択してください"
                options={options}
                onValueChange={(value) =>
                  setState((current) => ({
                    ...current,
                    thirdSelections: { ...current.thirdSelections, [slot.id]: value as GroupId }
                  }))
                }
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function MatchCard({
  match,
  index,
  state,
  matchesByRound,
  onWinner
}: {
  match: Match;
  index: number;
  state: PredictionState;
  matchesByRound: Record<RoundId, Match[]>;
  onWinner: (matchId: string, side: "left" | "right") => void;
}) {
  const left = resolveSeed(match.left, state, matchesByRound);
  const right = resolveSeed(match.right, state, matchesByRound);
  const winner = state.winners[match.id];

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between bg-muted px-3 py-2">
        <span className="text-xs font-black text-muted-foreground">{match.label}</span>
        <span className="text-xs font-semibold text-muted-foreground">試合 {index + 1}</span>
      </div>
      <CardContent className="space-y-3 p-3">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <div className={cn("min-w-0 rounded-lg border p-3", winner === "left" ? "border-gold bg-gold/15" : "border-border")}>
            <TeamPill team={left} muted={winner === "right"} />
          </div>
          <span className="text-xs font-black text-muted-foreground">vs</span>
          <div className={cn("min-w-0 rounded-lg border p-3", winner === "right" ? "border-gold bg-gold/15" : "border-border")}>
            <TeamPill team={right} muted={winner === "left"} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant={winner === "left" ? "gold" : "outline"} disabled={!left} onClick={() => onWinner(match.id, "left")}>
            左チーム勝利
          </Button>
          <Button variant={winner === "right" ? "gold" : "outline"} disabled={!right} onClick={() => onWinner(match.id, "right")}>
            右チーム勝利
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const [state, setState] = useState<PredictionState>(() => createInitialPrediction());
  const [step, setStep] = useState<"home" | "groups" | "tournament">("home");
  const [dark, setDark] = useState(false);
  const [message, setMessage] = useState("");
  const resultRef = useRef<HTMLDivElement>(null);

  const matchesByRound = useMemo(
    () =>
      allMatches.reduce(
        (acc, match) => {
          acc[match.round].push(match);
          return acc;
        },
        { r32: [], r16: [], qf: [], sf: [], final: [] } as Record<RoundId, Match[]>
      ),
    []
  );

  const champion = resolveSeed({ kind: "winner", round: "final", matchIndex: 0 }, state, matchesByRound);

  useEffect(() => {
    const shared = readPredictionFromUrl();
    if (shared) {
      setState(shared);
      setStep("tournament");
      setMessage("URL共有データを読み込みました");
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  const moveTeam = (group: GroupId, from: number, to: number) => {
    setState((current) => ({
      ...current,
      groupRankings: {
        ...current.groupRankings,
        [group]: reorder(current.groupRankings[group], from, to)
      }
    }));
  };

  const save = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    setMessage("保存しました");
  };

  const load = () => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setMessage("保存データがありません");
      return;
    }
    setState(JSON.parse(raw) as PredictionState);
    setStep("tournament");
    setMessage("保存データを読み込みました");
  };

  const reset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setState(createInitialPrediction());
    setStep("home");
    setMessage("リセットしました");
  };

  const shareUrl = async () => {
    const url = createShareUrl(state);
    await navigator.clipboard.writeText(url);
    setMessage("共有URLをコピーしました");
  };

  const exportPng = async () => {
    if (!resultRef.current) return;
    const dataUrl = await toPng(resultRef.current, { cacheBust: true, pixelRatio: 2 });
    const link = document.createElement("a");
    link.download = "wc2026-prediction.png";
    link.href = dataUrl;
    link.click();
    setMessage("PNG画像を出力しました");
  };

  const pickWinner = (matchId: string, side: "left" | "right") => {
    setState((current) => ({
      ...current,
      winners: { ...current.winners, [matchId]: side }
    }));
  };

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-4 pb-24 pt-4">
      <div className="sticky top-0 z-20 -mx-4 mb-4 border-b border-border bg-background/92 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm font-black text-primary">2026 FIFA WORLD CUP</div>
            <div className="truncate text-xs font-semibold text-muted-foreground">予想メーカー</div>
          </div>
          <div className="flex gap-2">
            <Button size="icon" variant="outline" aria-label="ダークモード切替" onClick={() => setDark((value) => !value)}>
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
            <Button size="icon" variant="outline" aria-label="保存" onClick={save}>
              <Save className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {message && <div className="mt-2 rounded-md bg-gold/15 px-3 py-2 text-xs font-bold text-foreground">{message}</div>}
      </div>

      {step === "home" && (
        <section className="flex min-h-[78vh] flex-col justify-center gap-6">
          <div className="space-y-3">
            <div className="inline-flex rounded-full bg-primary px-3 py-1 text-xs font-black text-primary-foreground">MOBILE PREDICTION</div>
            <h1 className="text-4xl font-black leading-tight tracking-normal">2026 FIFA WORLD CUP 予想メーカー</h1>
            <p className="text-base font-semibold text-muted-foreground">グループ順位と決勝トーナメントを予想しよう</p>
          </div>
          <div className="grid gap-3">
            <Button className="h-14" onClick={() => setStep("groups")}>
              <Play className="h-4 w-4" />
              予想開始
            </Button>
            <Button variant="outline" onClick={load}>
              <Upload className="h-4 w-4" />
              保存データ読込
            </Button>
            <Button variant="secondary" onClick={reset}>
              <RotateCcw className="h-4 w-4" />
              リセット
            </Button>
          </div>
        </section>
      )}

      {step !== "home" && (
        <div className="mb-4 grid grid-cols-2 gap-2">
          <Button variant={step === "groups" ? "default" : "outline"} onClick={() => setStep("groups")}>STEP1 グループ</Button>
          <Button variant={step === "tournament" ? "default" : "outline"} onClick={() => setStep("tournament")}>STEP2 決勝T</Button>
        </div>
      )}

      {step === "groups" && (
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-black">STEP1 グループリーグ順位予想</h2>
            <p className="text-sm text-muted-foreground">カードをドラッグ、または上下ボタンで1位から4位を並べ替えます。</p>
          </div>
          {groupIds.map((group) => (
            <GroupCard key={group} group={group} teams={state.groupRankings[group]} onMove={moveTeam} />
          ))}
          <Button className="w-full" variant="gold" onClick={() => setStep("tournament")}>
            決勝トーナメントへ
          </Button>
        </section>
      )}

      {step === "tournament" && (
        <section className="space-y-5">
          <div>
            <h2 className="text-2xl font-black">STEP2 決勝トーナメント</h2>
            <p className="text-sm text-muted-foreground">縦スクロールで各ラウンドの勝者を選択します。</p>
          </div>

          <ThirdPlacePicker state={state} setState={setState} />

          <div ref={resultRef} className="space-y-5 rounded-xl bg-background p-2">
            {(Object.keys(roundLabels) as RoundId[]).map((round) => (
              <div key={round} className="space-y-3">
                <div className="sticky top-[78px] z-10 rounded-lg bg-primary px-4 py-3 text-primary-foreground shadow-app">
                  <h3 className="text-lg font-black">{roundLabels[round]}</h3>
                </div>
                {matchesByRound[round].map((match, index) => (
                  <MatchCard
                    key={match.id}
                    match={match}
                    index={index}
                    state={state}
                    matchesByRound={matchesByRound}
                    onWinner={pickWinner}
                  />
                ))}
              </div>
            ))}

            <Card className="border-gold bg-gold/15">
              <CardContent className="space-y-4 p-5 text-center">
                <Trophy className="mx-auto h-16 w-16 text-gold" />
                <div>
                  <div className="text-sm font-black text-muted-foreground">🏆 優勝予想</div>
                  <div className="mt-2 flex justify-center text-3xl font-black">
                    <TeamPill team={champion} />
                  </div>
                </div>
                <div className="grid gap-3 text-left">
                  <label className="space-y-1">
                    <span className="text-sm font-bold">MVP予想</span>
                    <Input value={state.mvp} onChange={(event) => setState((current) => ({ ...current, mvp: event.target.value }))} placeholder="選手名を入力" />
                  </label>
                  <label className="space-y-1">
                    <span className="text-sm font-bold">得点王予想</span>
                    <Input value={state.topScorer} onChange={(event) => setState((current) => ({ ...current, topScorer: event.target.value }))} placeholder="選手名を入力" />
                  </label>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button onClick={shareUrl}>
              <Share2 className="h-4 w-4" />
              URL共有
            </Button>
            <Button variant="gold" onClick={exportPng}>
              <Download className="h-4 w-4" />
              PNG画像出力
            </Button>
          </div>
        </section>
      )}
    </main>
  );
}
