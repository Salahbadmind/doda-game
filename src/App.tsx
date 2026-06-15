/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Radio, 
  HelpCircle, 
  Cpu, 
  Sparkles, 
  Zap, 
  Disc, 
  Database,
  Terminal,
  Trophy
} from "lucide-react";
import { Track } from "./types";
import { TRACKS, audioEngine } from "./audioEngine";
import SnakeGame from "./components/SnakeGame";
import MusicPlayer from "./components/MusicPlayer";
import HighScores from "./components/HighScores";

export default function App() {
  const [currentTrack, setCurrentTrack] = useState<Track>(TRACKS[0]);
  const [musicPlaying, setMusicPlaying] = useState<boolean>(false);
  const [lastScore, setLastScore] = useState<number>(0);
  const [sessionTotalApples, setSessionTotalApples] = useState<number>(0);
  const [gameCrashCount, setGameCrashCount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<"gameplay" | "synth-guide">("gameplay");

  // Sync active track color dynamically with general body highlights
  const getThemeColorClass = () => {
    switch (currentTrack.id) {
      case "synthwave":
        return "text-rose-500 shadow-rose-500/20";
      case "lofi-ambient":
        return "text-cyan-500 shadow-cyan-500/20";
      case "chiptune":
        return "text-lime-500 shadow-lime-500/20";
      default:
        return "text-purple-500 shadow-purple-500/20";
    }
  };

  const getBorderThemeClass = () => {
    switch (currentTrack.id) {
      case "synthwave":
        return "border-rose-500/30";
      case "lofi-ambient":
        return "border-cyan-500/30";
      case "chiptune":
        return "border-lime-500/30";
      default:
        return "border-purple-500/30";
    }
  };

  const handleAppleEaten = (pointsGained: number) => {
    setLastScore((prev) => prev + pointsGained);
    setSessionTotalApples((prev) => prev + 1);
  };

  const handleGameCrash = () => {
    setGameCrashCount((prev) => prev + 1);
  };

  // Reset the temporary session score whenever a new grid starts
  // The actual scoring resets inside SnakeGame, we just mirror that state here
  const handleScoreReset = (newPointsGained: number) => {
    setLastScore(newPointsGained);
  };

  return (
    <div 
      className="min-h-screen text-zinc-100 flex flex-col font-sans relative selection:bg-zinc-700 select-none pb-12 overflow-x-hidden"
      style={{ background: "radial-gradient(circle at 0% 0%, #1a0b2e 0%, transparent 45%), radial-gradient(circle at 100% 100%, #00213d 0%, transparent 45%), #050505" }}
    >
      
      {/* Absolute futuristic horizontal grid pattern background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.06),rgba(255,255,255,0))]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,18,18,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(18,18,18,0.15)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none opacity-30" />

      {/* App Header Banner */}
      <header className="w-full max-w-7xl mx-auto px-6 pt-6 pb-2 z-10 flex flex-col md:flex-row items-center justify-between border-b border-white/5 gap-4 mb-6">
        <div className="flex items-center space-x-3.5">
          <div className="p-2.5 rounded-2xl glass-panel flex items-center justify-center shadow-lg">
            <Radio className={`w-6 h-6 transition-colors duration-500 ${getThemeColorClass()}`} />
          </div>
          <div>
            <h1 className="text-xl font-display font-black tracking-wide uppercase flex items-center gap-2">
              NEO SYNTH <span className="text-xs bg-white/5 border border-white/10 text-zinc-400 font-mono px-2 py-0.5 rounded-md">V2.4</span>
            </h1>
            <p className="text-[11px] font-mono text-zinc-500 tracking-wider uppercase mt-0.5">
              SYNTHESIZER SOUNDBOARD & RETRO SNAKE ARCADE
            </p>
          </div>
        </div>

        {/* Global live stats tickers */}
        <div className="grid grid-cols-3 gap-2.5 glass-panel p-1.5 rounded-2xl max-w-md w-full md:w-auto">
          <div className="px-4 py-1 rounded-xl bg-black/40 flex flex-col items-center justify-center min-w-[90px]">
            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">Session Food</span>
            <span className="text-xs font-mono font-bold text-zinc-200 mt-0.5 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              {sessionTotalApples}
            </span>
          </div>
          <div className="px-4 py-1 rounded-xl bg-black/40 flex flex-col items-center justify-center min-w-[90px]">
            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">Active BPM</span>
            <span className="text-xs font-mono font-bold transition-all duration-300 mt-0.5" style={{ color: getThemeColorClass().split(" ")[0] }}>
              {currentTrack.bpm}
            </span>
          </div>
          <div className="px-4 py-1 rounded-xl bg-black/40 flex flex-col items-center justify-center min-w-[90px]">
            <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">CPU Grid</span>
            <span className="text-xs font-mono font-bold text-zinc-200 mt-0.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              STABLE
            </span>
          </div>
        </div>
      </header>

      {/* Main Grid Viewport - 3 columns on large desktop, 2 columns on tablet, stacks on mobile */}
      <main className="w-full max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-6 z-10 items-stretch flex-1">
        
        {/* Flank Column 1: Music Synth Controller (4 columns wide on large screen) */}
        <div className="lg:col-span-4 flex flex-col h-full min-h-[500px]">
          <MusicPlayer
            currentTrack={currentTrack}
            onTrackChange={(track) => {
              setCurrentTrack(track);
              setLastScore(0); // reset temporary buffer on music selection change
            }}
            isPlaying={musicPlaying}
            setIsPlaying={setMusicPlaying}
          />
        </div>

        {/* Central Column 2: Glowing Snake Canvas Engine (4 columns wide) */}
        <div className="lg:col-span-4 flex flex-col items-center justify-center h-full">
          <SnakeGame
            activeTrack={currentTrack}
            musicPlaying={musicPlaying}
            onAppleEaten={handleAppleEaten}
            onGameCrash={handleGameCrash}
          />
        </div>

        {/* Flank Column 3: High Scores Dashboard & Guides (4 columns wide) */}
        <div className="lg:col-span-4 flex flex-col gap-6 h-full">
          
          {/* Top block: Leader boards */}
          <div className="flex-1">
            <HighScores
              score={lastScore}
              activeTrack={currentTrack}
              gameCrashCount={gameCrashCount}
            />
          </div>

          {/* Lower block: Interactive Quick Instructions Panel */}
          <div className="glass-panel rounded-2xl p-5 shadow-xl relative overflow-hidden">
            <div className="flex items-center space-x-2 mb-3.5">
              <HelpCircle className="w-4 h-4 text-zinc-400" />
              <h3 className="font-mono text-xs uppercase tracking-wider font-semibold text-zinc-300">
                Performance Guide
              </h3>
            </div>

            <div className="space-y-3">
              {/* Audio integration callouts */}
              <div className="p-3 bg-black/40 border border-white/5 rounded-xl space-y-1.5">
                <div className="flex items-center space-x-2">
                  <Terminal className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="text-[11px] font-mono font-medium text-zinc-300 uppercase">
                    BPM Speed Sync
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 leading-normal">
                  The snake speed synchronises with the track BPM! Chill with <span className="text-cyan-400 font-semibold">'Neon Chill Space'</span> at 90 BPM for precision, or hyper-charge with <span className="text-lime-400 font-semibold">'8-bit Arcade Frenzy'</span> at 140 BPM to fast-track scores.
                </p>
              </div>

              {/* High Score criteria details */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 bg-black/40 border border-white/5 rounded-xl">
                  <div className="text-[9px] font-mono text-zinc-500 uppercase">Regular Seed</div>
                  <div className="text-xs font-bold text-white mt-1">+10 Points</div>
                </div>
                <div className="p-2.5 bg-black/40 border border-white/5 rounded-xl">
                  <div className="text-[9px] font-mono text-amber-500 uppercase flex items-center gap-1">
                    <Sparkles className="w-3" style={{ color: "rgb(245, 158, 11)" }} />
                    Super Cell
                  </div>
                  <div className="text-xs font-bold text-amber-400 mt-1">+30 Points</div>
                </div>
              </div>

              <div className="text-[9px] font-mono text-zinc-650 uppercase text-center leading-relaxed">
                Synthesis & Audio Visualizers processed live in-browser via web audio API nodes. Complete zero delay.
              </div>
            </div>
          </div>

        </div>

      </main>

      {/* Ambient Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 mt-12 pt-4 border-t border-white/5 text-center tracking-wide text-[10px] font-mono text-zinc-600 flex flex-col sm:flex-row items-center justify-between gap-4 z-10 uppercase">
        <div>
          COIN-OP RETRO INTEGRATED CABINET ENGINE • 2026 CLIENT BUILD
        </div>
        <div className="flex items-center gap-1.5">
          <Database className="w-3.5 h-3.5 text-zinc-650" />
          <span>REACTIVE MEMORY LOCAL STORAGE ACTIVE</span>
        </div>
      </footer>

    </div>
  );
}
