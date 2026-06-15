/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { Trophy, Calendar, Sparkles, User, Play, RefreshCw, Zap } from "lucide-react";
import { HighScoreEntry, Track } from "../types";

interface HighScoresProps {
  score: number;
  activeTrack: Track;
  gameCrashCount: number;
}

// Initial retro cyber-legends scoreboard
const DEFAULT_SCORES: HighScoreEntry[] = [
  { name: "NEO_GRID", score: 280, date: "2026-06-12", level: 140 }, // Chiptune
  { name: "REZ_FLY", score: 180, date: "2026-06-14", level: 120 },  // Synthwave
  { name: "LO_FI_CHILL", score: 90, date: "2026-06-15", level: 90 }, // Ambient
  { name: "K_D_TRON", score: 60, date: "2026-05-10", level: 120 },
  { name: "BUG_FINDER", score: 30, date: "2026-06-01", level: 90 },
];

export default function HighScores({
  score,
  activeTrack,
  gameCrashCount,
}: HighScoresProps) {
  const [board, setBoard] = useState<HighScoreEntry[]>([]);
  const [initials, setInitials] = useState<string>("");
  const [isEligible, setIsEligible] = useState<boolean>(false);
  const [hasSaved, setHasSaved] = useState<boolean>(false);

  // Sync high scores from local storage
  const loadScores = () => {
    const saved = localStorage.getItem("neo_arcade_highscores_v2");
    if (saved) {
      setBoard(JSON.parse(saved));
    } else {
      setBoard(DEFAULT_SCORES);
      localStorage.setItem("neo_arcade_highscores_v2", JSON.stringify(DEFAULT_SCORES));
    }
  };

  useEffect(() => {
    loadScores();
  }, []);

  // Whenever game over crash count triggers, check eligibility
  useEffect(() => {
    if (score <= 0) {
      setIsEligible(false);
      return;
    }

    // Is the score higher than the lowest in our board?
    const isHigher = board.length < 5 || board.some((entry) => score > entry.score);
    setIsEligible(isHigher);
    setHasSaved(false); // Reset saved flag on next crashes
  }, [gameCrashCount, score, board]);

  const saveHighScore = (e: React.FormEvent) => {
    e.preventDefault();
    if (!initials.trim()) return;

    const formattedInitials = initials.slice(0, 4).toUpperCase().trim();
    const newEntry: HighScoreEntry = {
      name: formattedInitials || "ANON",
      score: score,
      date: new Date().toISOString().split("T")[0],
      level: activeTrack.bpm,
    };

    const updatedBoard = [...board, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5); // top 5 entries

    setBoard(updatedBoard);
    localStorage.setItem("neo_arcade_highscores_v2", JSON.stringify(updatedBoard));
    setIsEligible(false);
    setHasSaved(true);
    setInitials("");
  };

  const clearLeaderboard = () => {
    if (window.confirm("Format arcade memory? This cannot be undone.")) {
      localStorage.removeItem("neo_arcade_highscores_v2");
      setBoard(DEFAULT_SCORES);
      localStorage.setItem("neo_arcade_highscores_v2", JSON.stringify(DEFAULT_SCORES));
    }
  };

  const getTrackColor = (bpm: number) => {
    if (bpm >= 135) return "#84cc16"; // lime
    if (bpm <= 95) return "#06b6d4";  // cyan
    return "#f43f5e"; // rose
  };

  return (
    <div className="flex flex-col glass-panel rounded-2xl p-6 relative overflow-hidden h-full">
      {/* Upper Corner light */}
      <div 
        className="absolute -top-16 -left-16 w-36 h-36 rounded-full filter blur-[60px] opacity-15 bg-lime-505"
      />

      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center space-x-2">
          <Trophy className="w-5 h-5 text-amber-400" />
          <h2 className="font-mono text-sm uppercase tracking-wider font-semibold text-zinc-300">
            Arcade Hall of Fame
          </h2>
        </div>
        <button
          onClick={clearLeaderboard}
          className="text-[9px] font-mono text-zinc-600 hover:text-rose-400 transition-colors uppercase tracking-widest cursor-pointer"
          title="Reset arcade highscore list"
        >
          Format Ram
        </button>
      </div>

      {/* Eligible high score entry form */}
      {isEligible && !hasSaved && (
        <form 
          onSubmit={saveHighScore}
          className="mb-6 p-4 bg-lime-950/20 border border-lime-500/30 rounded-2xl animate-pulse-subtle"
        >
          <div className="flex items-center space-x-2 text-lime-400 mb-2">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-mono font-medium uppercase tracking-wider">
              NEW RECORD DETECTED!
            </span>
          </div>
          <p className="text-[11px] text-zinc-400 mb-3.5 leading-relaxed">
            Your score of <span className="text-white font-bold">{score}</span> points qualifies you for the leader boards. Save your initials!
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              id="initials_input"
              maxLength={4}
              placeholder="SBA"
              value={initials}
              onChange={(e) => setInitials(e.target.value)}
              className="flex-1 bg-black/60 border border-zinc-700 rounded-xl px-3 py-2 text-center text-sm font-bold uppercase tracking-wider text-lime-400 focus:outline-none focus:border-lime-500"
            />
            <button
              type="submit"
              id="btn_save_score"
              className="bg-lime-500 text-black font-semibold font-mono text-xs uppercase px-4 py-2 rounded-xl hover:scale-105 active:scale-95 transition-all shadow-[0_0_15px_rgba(132,204,22,0.4)] cursor-pointer"
            >
              Log Score
            </button>
          </div>
        </form>
      )}

      {hasSaved && (
        <div className="mb-5 p-3.5 bg-zinc-950/50 border border-zinc-800 rounded-2xl text-center text-xs text-lime-400 font-mono">
          ✓ RECORD SUCCESSFULY COMMITTED TO MEMORY!
        </div>
      )}

      {/* Hall of Fame Scores list */}
      <div className="flex-1 space-y-2.5">
        {board.map((entry, index) => {
          const isTopNum = index === 0;
          const isUser = entry.name === initials.toUpperCase();
          const trackColor = getTrackColor(entry.level);
          
          return (
            <div
              key={index}
              className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                isTopNum
                  ? "bg-amber-500/10 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                  : "bg-black/40 border-white/5"
              }`}
            >
              {/* Placement & Name */}
              <div className="flex items-center space-x-3.5">
                <span 
                  className={`font-mono text-xs font-bold w-5 text-center ${
                    index === 0 
                      ? "text-amber-400 font-extrabold text-sm" 
                      : index === 1 
                      ? "text-zinc-300" 
                      : index === 2 
                      ? "text-amber-750" 
                      : "text-zinc-600"
                  }`}
                >
                  #{index + 1}
                </span>
                
                <div className="flex flex-col">
                  <span className="font-mono text-xs font-bold text-zinc-100 tracking-wider">
                    {entry.name}
                  </span>
                  <div className="flex items-center space-x-1.5 mt-0.5">
                    <Zap className="w-2.5 h-2.5 text-zinc-500" />
                    <span 
                      className="text-[9px] font-mono font-medium" 
                      style={{ color: trackColor }}
                    >
                      BPM: {entry.level}
                    </span>
                  </div>
                </div>
              </div>

              {/* Score Metric */}
              <div className="text-right flex flex-col">
                <span className="text-xs font-bold font-mono tracking-wider text-white">
                  {entry.score} <span className="text-[10px] text-zinc-500 font-normal">PTS</span>
                </span>
                <span className="text-[8px] font-mono text-zinc-500 mt-0.5">
                  {entry.date}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Arcade cabinet credit visualizer */}
      <div className="mt-5 border border-white/10 bg-black/40 p-3 rounded-2xl flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
            Arcade CPU Temp
          </span>
          <span className="text-xs font-mono text-zinc-400 mt-0.5 font-bold">
            36°C <span className="text-zinc-600 font-normal font-sans">| NORMAL</span>
          </span>
        </div>
        <div className="h-5 w-px bg-white/10" />
        <div className="flex flex-col text-right">
          <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
            Free RAM Memory
          </span>
          <span className="text-xs font-mono text-zinc-400 mt-0.5 font-bold">
            1024 KB
          </span>
        </div>
      </div>

    </div>
  );
}
