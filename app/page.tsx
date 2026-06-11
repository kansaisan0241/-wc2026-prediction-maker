"use client";

import {
  ChevronDown,
  ChevronUp,
  Download,
  Moon,
  Play,
  RotateCcw,
  Share2,
  Sun,
  Trophy,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { allMatches, createInitialPrediction, getFlagUrl, groupIds, thirdSlots } from "@/lib/data";
import { createShareUrl, readPredictionFromUrl } from "@/lib/storage";
import type { GroupId, Match, PredictionState, RoundId, Seed, Team } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

function resolveLoser(match: Match, state: PredictionState, matchesByRound: Record<RoundId, Match[]>): Team | null {
  const winner = state.winners[match.id];
  if (!winner) return null;
  return resolveSeed(match[winner === "left" ? "right" : "left"], state, matchesByRound);
}

function getFinalResults(state: PredictionState, matchesByRound: Record<RoundId, Match[]>) {
  const finalMatch = matchesByRound.final[0];
  const thirdPlaceSide = state.winners["third-place"];
  const finalWinner = state.winners[finalMatch.id];
  const champion = finalWinner ? resolveSeed(finalMatch[finalWinner], state, matchesByRound) : null;
  const runnerUp = finalWinner ? resolveSeed(finalMatch[finalWinner === "left" ? "right" : "left"], state, matchesByRound) : null;
  const semiLosers = [resolveLoser(matchesByRound.sf[0], state, matchesByRound), resolveLoser(matchesByRound.sf[1], state, matchesByRound)];
  const third = thirdPlaceSide ? semiLosers[thirdPlaceSide === "left" ? 0 : 1] : null;
  const fourth = thirdPlaceSide ? semiLosers[thirdPlaceSide === "left" ? 1 : 0] : null;

  return { champion, runnerUp, third, fourth, semiLosers };
}

function getJapanResult(state: PredictionState, matchesByRound: Record<RoundId, Match[]>) {
  const japan = Object.values(state.groupRankings).flat().find((team) => team.flagCode === "jp");
  if (!japan) return "日本: 未定";
  const sameTeam = (team: Team | null) => team?.id === japan.id;
  const results = getFinalResults(state, matchesByRound);
  if (sameTeam(results.champion)) return "日本: 優勝";
  if (sameTeam(results.runnerUp)) return "日本: 準優勝";
  if (sameTeam(results.third)) return "日本: 3位";
  if (sameTeam(results.fourth)) return "日本: 4位";
  if (results.semiLosers.some(sameTeam)) return "日本: ベスト4";

  const qfLosers = matchesByRound.qf.map((match) => resolveLoser(match, state, matchesByRound));
  if (qfLosers.some(sameTeam)) return "日本: ベスト8";

  const r16Losers = matchesByRound.r16.map((match) => resolveLoser(match, state, matchesByRound));
  if (r16Losers.some(sameTeam)) return "日本: ベスト16";

  const r32Losers = matchesByRound.r32.map((match) => resolveLoser(match, state, matchesByRound));
  if (r32Losers.some(sameTeam)) return "日本: ベスト32";

  const isRound32Team = matchesByRound.r32.some((match) => sameTeam(resolveSeed(match.left, state, matchesByRound)) || sameTeam(resolveSeed(match.right, state, matchesByRound)));
  return isRound32Team ? "日本: ベスト32" : "日本: グループ敗退";
}

function drawBracketPng(state: PredictionState, matchesByRound: Record<RoundId, Match[]>) {
  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 560;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const text = "#111111";
  const muted = "#777777";
  const blue = "#0757a6";
  const gold = "#f3b21a";
  const results = getFinalResults(state, matchesByRound);
  const now = new Date();
  const timestamp = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textBaseline = "middle";

  const fitText = (value: string, maxWidth: number) => {
    if (ctx.measureText(value).width <= maxWidth) return value;
    let next = value;
    while (next.length > 1 && ctx.measureText(`${next}...`).width > maxWidth) {
      next = next.slice(0, -1);
    }
    return `${next}...`;
  };

  const drawText = (value: string, x: number, y: number, align: CanvasTextAlign = "left", size = 24, color = text, maxWidth = 220, weight = 700) => {
    ctx.font = `${weight} ${size}px 'Noto Sans JP', 'Yu Gothic UI', Meiryo, sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.fillText(fitText(value, maxWidth), x, y);
  };

  const drawResultBox = (rank: string, team: Team | null, y: number, accent = false) => {
    ctx.fillStyle = accent ? "#fff7df" : "#ffffff";
    ctx.strokeStyle = accent ? gold : "#dddddd";
    ctx.lineWidth = accent ? 3 : 2;
    ctx.beginPath();
    ctx.roundRect(210, y - 38, 480, 76, 14);
    ctx.fill();
    ctx.stroke();
    drawText(rank, 250, y, "left", 24, accent ? "#a96f00" : muted, 100);
    drawText(team?.name ?? "未定", 490, y, "center", 32, text, 250);
  };

  drawText("2026 FIFA WORLD CUP", 450, 58, "center", 20, blue, 360);
  drawText("予想結果", 450, 102, "center", 36, text, 360);
  drawResultBox("1位", results.champion, 180, true);
  drawResultBox("2位", results.runnerUp, 270);
  drawResultBox("3位", results.third, 360);
  drawResultBox("4位", results.fourth, 450);
  drawText(getJapanResult(state, matchesByRound), 450, 510, "center", 24, blue, 360);
  drawText(`出力日時: ${timestamp}`, 870, 535, "right", 13, muted, 260, 500);

  return canvas.toDataURL("image/png");
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
            className="flex touch-pan-y items-center gap-3 rounded-lg border border-border bg-background p-3 shadow-sm"
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
          return (
            <div key={slot.id} className="rounded-lg border border-border bg-background p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-xs font-bold text-muted-foreground">3位枠 {index + 1}</div>
                <div className="text-[11px] font-bold text-muted-foreground">{slot.groups.join("/")}組から選択</div>
              </div>
              <div className="grid gap-2">
                {slot.groups.map((group) => {
                  const team = state.groupRankings[group][2];
                  const isSelected = selected === group;
                  const isUsed = usedGroups.has(group) && !isSelected;

                  return (
                    <button
                      key={group}
                      type="button"
                      disabled={isUsed}
                      onClick={() =>
                        setState((current) => ({
                          ...current,
                          thirdSelections: { ...current.thirdSelections, [slot.id]: group }
                        }))
                      }
                      className={cn(
                        "flex min-h-14 items-center gap-3 rounded-lg border px-3 py-2 text-left transition active:scale-[0.99] disabled:opacity-35",
                        isSelected ? "border-gold bg-gold/15 shadow-sm" : "border-border bg-card hover:bg-muted"
                      )}
                    >
                      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black", isSelected ? "bg-gold text-slate-950" : "bg-muted text-muted-foreground")}>
                        {group}
                      </span>
                      <TeamPill team={team} />
                      {isUsed && <span className="ml-auto shrink-0 text-[11px] font-bold text-muted-foreground">選択済み</span>}
                    </button>
                  );
                })}
              </div>
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
  const locked = !left || !right;

  return (
    <Card className={cn("overflow-hidden transition", winner && "animate-advance border-gold/70")}>
      <div className="flex items-center justify-between bg-muted px-3 py-2">
        <span className="text-xs font-black text-muted-foreground">{match.label}</span>
        <span className="text-xs font-semibold text-muted-foreground">試合 {index + 1}</span>
      </div>
      <CardContent className="space-y-2 p-3">
        <button
          type="button"
          disabled={!left || locked}
          onClick={() => onWinner(match.id, "left")}
          className={cn(
            "w-full rounded-lg border p-3 text-left transition active:scale-[0.99] disabled:opacity-45",
            winner === "left" ? "border-gold bg-gold/15 shadow-sm" : "border-border bg-background hover:bg-muted"
          )}
        >
            <TeamPill team={left} muted={winner === "right"} />
        </button>
        <div className="text-center text-[10px] font-black uppercase text-muted-foreground">vs</div>
        <button
          type="button"
          disabled={!right || locked}
          onClick={() => onWinner(match.id, "right")}
          className={cn(
            "w-full rounded-lg border p-3 text-left transition active:scale-[0.99] disabled:opacity-45",
            winner === "right" ? "border-gold bg-gold/15 shadow-sm" : "border-border bg-background hover:bg-muted"
          )}
        >
            <TeamPill team={right} muted={winner === "left"} />
        </button>
      </CardContent>
    </Card>
  );
}

function PlacementMatchCard({
  left,
  right,
  winner,
  onWinner
}: {
  left: Team | null;
  right: Team | null;
  winner: "left" | "right" | "";
  onWinner: (side: "left" | "right") => void;
}) {
  const locked = !left || !right;

  return (
    <Card className={cn("overflow-hidden transition", winner && "animate-advance border-gold/70")}>
      <div className="flex items-center justify-between bg-muted px-3 py-2">
        <span className="text-xs font-black text-muted-foreground">3位決定戦</span>
        <span className="text-xs font-semibold text-muted-foreground">3位/4位</span>
      </div>
      <CardContent className="space-y-2 p-3">
        <button
          type="button"
          disabled={!left || locked}
          onClick={() => onWinner("left")}
          className={cn(
            "w-full rounded-lg border p-3 text-left transition active:scale-[0.99] disabled:opacity-45",
            winner === "left" ? "border-gold bg-gold/15 shadow-sm" : "border-border bg-background hover:bg-muted"
          )}
        >
          <TeamPill team={left} muted={winner === "right"} />
        </button>
        <div className="text-center text-[10px] font-black uppercase text-muted-foreground">vs</div>
        <button
          type="button"
          disabled={!right || locked}
          onClick={() => onWinner("right")}
          className={cn(
            "w-full rounded-lg border p-3 text-left transition active:scale-[0.99] disabled:opacity-45",
            winner === "right" ? "border-gold bg-gold/15 shadow-sm" : "border-border bg-background hover:bg-muted"
          )}
        >
          <TeamPill team={right} muted={winner === "left"} />
        </button>
      </CardContent>
    </Card>
  );
}

function TournamentEntry({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border bg-card p-3 shadow-sm">
      <div className="rounded-lg bg-primary px-4 py-3 text-primary-foreground">
        <h3 className="text-base font-black">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function Home() {
  const [state, setState] = useState<PredictionState>(() => createInitialPrediction());
  const [step, setStep] = useState<"home" | "groups" | "tournament">("home");
  const [dark, setDark] = useState(false);
  const [message, setMessage] = useState("");

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

  const finalResults = getFinalResults(state, matchesByRound);
  const champion = finalResults.champion;

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
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [step]);

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

  const reset = () => {
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
    const dataUrl = drawBracketPng(state, matchesByRound);
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.download = "wc2026-prediction.png";
    link.href = dataUrl;
    link.click();
    setMessage("画像を保存しました");
  };

  const pickWinner = (matchId: string, side: "left" | "right") => {
    setState((current) => ({
      ...current,
      winners: { ...current.winners, [matchId]: side }
    }));
  };

  const pickThirdPlace = (side: "left" | "right") => {
    setState((current) => ({
      ...current,
      winners: { ...current.winners, "third-place": side }
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
            <p className="text-sm text-muted-foreground">ベスト32をすべて選んでから、ベスト16以降へ進みます。</p>
          </div>

          <ThirdPlacePicker state={state} setState={setState} />

          <div className="space-y-5 rounded-xl bg-background p-2">
            <TournamentEntry title="ベスト32">
              <div className="grid gap-3">
                {matchesByRound.r32.map((match, index) => (
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
            </TournamentEntry>

            {(["r16", "qf", "sf"] as RoundId[]).map((round) => (
              <TournamentEntry key={round} title={roundLabels[round]}>
                <div className="grid gap-3">
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
              </TournamentEntry>
            ))}

            <TournamentEntry title="3位決定戦">
              <PlacementMatchCard
                left={finalResults.semiLosers[0]}
                right={finalResults.semiLosers[1]}
                winner={state.winners["third-place"] || ""}
                onWinner={pickThirdPlace}
              />
            </TournamentEntry>

            <TournamentEntry title={roundLabels.final}>
              <MatchCard
                match={matchesByRound.final[0]}
                index={0}
                state={state}
                matchesByRound={matchesByRound}
                onWinner={pickWinner}
              />
            </TournamentEntry>

            <Card className="border-gold bg-gold/15">
              <CardContent className="space-y-4 p-5 text-center">
                <Trophy className="mx-auto h-16 w-16 text-gold" />
                <div>
                  <div className="text-sm font-black text-muted-foreground">🏆 優勝予想</div>
                  <div className="mt-2 flex justify-center text-3xl font-black">
                    <TeamPill team={champion} />
                  </div>
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
              画像保存
            </Button>
          </div>
        </section>
      )}
    </main>
  );
}
