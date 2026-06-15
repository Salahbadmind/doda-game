/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from "react";
import { Play, RotateCcw, Pause, Sparkles, Volume2, Gamepad2, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from "lucide-react";
import { Track } from "../types";
import { audioEngine } from "../audioEngine";

interface SnakeGameProps {
  activeTrack: Track;
  musicPlaying: boolean;
  onAppleEaten: (currentScore: number) => void;
  onGameCrash: () => void;
}

const GRID_SIZE = 22; // 22x22 playable grid

export default function SnakeGame({
  activeTrack,
  musicPlaying,
  onAppleEaten,
  onGameCrash,
}: SnakeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Gameplay State
  const [snake, setSnake] = useState<{ x: number; y: number }[]>([
    { x: 11, y: 11 },
    { x: 11, y: 12 },
    { x: 11, y: 13 },
  ]);
  const [direction, setDirection] = useState<{ x: number; y: number }>({ x: 0, y: -1 });
  const [food, setFood] = useState<{ x: number; y: number }>({ x: 5, y: 5 });
  const [isSuperFood, setIsSuperFood] = useState<boolean>(false);
  const [score, setScore] = useState<number>(0);
  const [highScore, setHighScore] = useState<number>(() => {
    const saved = localStorage.getItem("nepn_snake_highscore");
    return saved ? parseInt(saved, 10) : 0;
  });
  const [gameState, setGameState] = useState<"idle" | "playing" | "gameover" | "paused">("idle");
  const [speedMs, setSpeedMs] = useState<number>(100);

  // Visual/Particle Engine State
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; color: string; life: number; size: number }[]>([]);

  // Track color theme helpers
  const getThemeColor = () => {
    switch (activeTrack.id) {
      case "synthwave":
        return "#f43f5e"; // rose-500
      case "lofi-ambient":
        return "#06b6d4"; // cyan-500
      case "chiptune":
        return "#84cc16"; // lime-500
      default:
        return "#a855f7"; // purple-500
    }
  };

  const getSecondaryThemeColor = () => {
    switch (activeTrack.id) {
      case "synthwave":
        return "#ec4899"; // fuchsia-500
      case "lofi-ambient":
        return "#3b82f6"; // blue-500
      case "chiptune":
        return "#10b981"; // emerald-500
      default:
        return "#ec4899";
    }
  };

  // Adjust game speed dynamically based on current track BPM
  useEffect(() => {
    // 140 BPM (fast track) -> speed 80ms
    // 120 BPM (mid track) -> speed 110ms
    // 90 BPM (lofi track) -> speed 150ms
    let calculatedSpeed = 110;
    if (activeTrack.bpm >= 135) calculatedSpeed = 80;
    else if (activeTrack.bpm <= 95) calculatedSpeed = 150;
    
    setSpeedMs(calculatedSpeed);
  }, [activeTrack]);

  // Generate random food coordinates safely outside snake body
  const spawnFood = (currentSnake: { x: number; y: number }[]) => {
    let spawned = false;
    let newX = 0;
    let newY = 0;
    
    while (!spawned) {
      newX = Math.floor(Math.random() * GRID_SIZE);
      newY = Math.floor(Math.random() * GRID_SIZE);
      
      // confirm food doesn't land inside current snake body
      const hitsSnake = currentSnake.some(
        (seg) => seg.x === newX && seg.y === newY
      );
      if (!hitsSnake) {
        spawned = true;
      }
    }

    setFood({ x: newX, y: newY });
    setIsSuperFood(Math.random() > 0.85); // 15% chance to spawn a Super Golden Food
  };

  // Trigger spark blast particles at a food location
  const createExplosion = (x: number, y: number, color: string) => {
    const freshParticles = [];
    const count = isSuperFood ? 25 : 12;
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      freshParticles.push({
        x: x * 18 + 9, // relative canvas scale pixel coord
        y: y * 18 + 9,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: color,
        life: 1.0,
        size: Math.random() * 3 + 1.5,
      });
    }
    particlesRef.current = [...particlesRef.current, ...freshParticles];
  };

  // Main loop to update game ticks
  useEffect(() => {
    if (gameState !== "playing") return;

    const gameInterval = setInterval(() => {
      setSnake((prevSnake) => {
        const head = prevSnake[0];
        const nextHead = {
          x: head.x + direction.x,
          y: head.y + direction.y,
        };

        // Collision Check 1: Boundaries
        if (
          nextHead.x < 0 ||
          nextHead.x >= GRID_SIZE ||
          nextHead.y < 0 ||
          nextHead.y >= GRID_SIZE
        ) {
          handleGameOver();
          return prevSnake;
        }

        // Collision Check 2: Self Collision
        const selfCrash = prevSnake.some(
          (segment) => segment.x === nextHead.x && segment.y === nextHead.y
        );
        if (selfCrash) {
          handleGameOver();
          return prevSnake;
        }

        const newSnake = [nextHead, ...prevSnake];

        // Eat Check
        if (nextHead.x === food.x && nextHead.y === food.y) {
          audioEngine.playEatEffect();
          const pointsGained = isSuperFood ? 30 : 10;
          const freshScore = score + pointsGained;
          
          setScore(freshScore);
          onAppleEaten(pointsGained);

          // Spawn particle explosion
          createExplosion(food.x, food.y, isSuperFood ? "#fbbf24" : getThemeColor());

          if (freshScore > highScore) {
            setHighScore(freshScore);
            localStorage.setItem("nepn_snake_highscore", freshScore.toString());
          }

          spawnFood(newSnake);
        } else {
          // Normal movement: drop last segment
          newSnake.pop();
        }

        return newSnake;
      });
    }, speedMs);

    return () => clearInterval(gameInterval);
  }, [snake, direction, food, gameState, speedMs, isSuperFood, score, highScore, activeTrack]);

  // Prevent default page arrow scrolling and handle keyboard input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent browser default arrow navigation keys scrolling
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }

      if (gameState !== "playing") {
        if (e.key === "Enter" || e.key === " ") {
          startGame();
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case "arrowup":
        case "w":
          if (direction.y === 0) setDirection({ x: 0, y: -1 });
          break;
        case "arrowdown":
        case "s":
          if (direction.y === 0) setDirection({ x: 0, y: 1 });
          break;
        case "arrowleft":
        case "a":
          if (direction.x === 0) setDirection({ x: -1, y: 0 });
          break;
        case "arrowright":
        case "d":
          if (direction.x === 0) setDirection({ x: 1, y: 0 });
          break;
        case "escape":
        case "p":
          pauseGame();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [direction, gameState]);

  // Frame Animator Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;

    const render = () => {
      // Clear viewport
      ctx.fillStyle = "#09090b"; // slate-950
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Render 1: Background laser cyber gridlines
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = "rgba(107, 114, 128, 0.15)";
      
      const width = canvas.width;
      const height = canvas.height;
      const step = 18; // grid cell size

      for (let x = 0; x < width; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Render 2: Fruit / Target glow and square
      const foodThemeColor = isSuperFood ? "#fbbf24" : getThemeColor();
      ctx.shadowBlur = 15;
      ctx.shadowColor = foodThemeColor;
      ctx.fillStyle = foodThemeColor;

      ctx.beginPath();
      if (isSuperFood) {
        // Star shape or diamond for Golden Mega Food
        ctx.arc(food.x * step + step/2, food.y * step + step/2, step/2 - 2, 0, Math.PI * 2);
        ctx.fillStyle = "#fbbf24";
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "#ffffff";
        ctx.stroke();
      } else {
        // Glowing tech neon seed
        ctx.roundRect(food.x * step + 2, food.y * step + 2, step - 4, step - 4, 3);
        ctx.fill();
      }

      // Render 3: Neo Snake Body + Trail
      const primaryColor = getThemeColor();
      const secondaryColor = getSecondaryThemeColor();
      
      snake.forEach((segment, idx) => {
        const isHead = idx === 0;
        
        ctx.shadowBlur = isHead ? 20 : 10;
        ctx.shadowColor = isHead ? primaryColor : secondaryColor;
        
        // Gradient fade-down toward tail segment
        const segmentFill = isHead 
          ? primaryColor 
          : `rgba(${hexToRgb(secondaryColor)}, ${1 - (idx / snake.length) * 0.75})`;
        ctx.fillStyle = segmentFill;

        ctx.beginPath();
        if (isHead) {
          // Round standard snake retro head pointing towards target direction
          ctx.roundRect(segment.x * step + 1, segment.y * step + 1, step - 2, step - 2, 5);
          ctx.fill();

          // Action Cyber Eye coordinates
          ctx.fillStyle = "#ffffff";
          ctx.shadowBlur = 0;
          if (direction.x !== 0) {
            ctx.fillRect(segment.x * step + (direction.x > 0 ? 11 : 4), segment.y * step + 4, 3, 3);
            ctx.fillRect(segment.x * step + (direction.x > 0 ? 11 : 4), segment.y * step + 11, 3, 3);
          } else {
            ctx.fillRect(segment.x * step + 4, segment.y * step + (direction.y > 0 ? 11 : 4), 3, 3);
            ctx.fillRect(segment.x * step + 11, segment.y * step + (direction.y > 0 ? 11 : 4), 3, 3);
          }
        } else {
          ctx.roundRect(segment.x * step + 2, segment.y * step + 2, step - 4, step - 4, 3);
          ctx.fill();
        }
      });

      // Render 4: Particles dynamic physics engine
      ctx.shadowBlur = 8;
      particlesRef.current = particlesRef.current.filter((p) => p.life > 0.05);
      particlesRef.current.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05; // gravity pull
        p.life -= 0.025; // fade rate
        
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0; // Reset canvas global settings
      ctx.shadowBlur = 0;

      // Overlay 5: Scanline cyber CRT effects
      ctx.fillStyle = "rgba(18, 18, 18, 0.03)";
      for (let sl = 0; sl < height; sl += 4) {
        ctx.fillRect(0, sl, width, 1.2);
      }

      animationId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationId);
  }, [snake, food, isSuperFood, activeTrack, direction]);

  // Utility to convert color hex values to raw RGB strings
  const hexToRgb = (hex: string) => {
    const bigint = parseInt(hex.replace("#", ""), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `${r}, ${g}, ${b}`;
  };

  const startGame = () => {
    if (gameState === "playing") return;
    
    // Resume audio context safely on interaction
    if (!audioEngine.getIsPlaying() && !musicPlaying) {
      audioEngine.start();
    }

    if (gameState === "gameover" || gameState === "idle") {
      const initialSnake = [
        { x: 11, y: 11 },
        { x: 11, y: 12 },
        { x: 11, y: 13 },
      ];
      setSnake(initialSnake);
      setDirection({ x: 0, y: -1 });
      setScore(0);
      spawnFood(initialSnake);
    }
    setGameState("playing");
  };

  const pauseGame = () => {
    setGameState("paused");
  };

  const handleGameOver = () => {
    setGameState("gameover");
    audioEngine.playCrashEffect();
    onGameCrash();
  };

  // On Screen Manual Controllers for Mobile compatibility! Or mouse players
  const turnUp = () => direction.y === 0 && setDirection({ x: 0, y: -1 });
  const turnDown = () => direction.y === 0 && setDirection({ x: 0, y: 1 });
  const turnLeft = () => direction.x === 0 && setDirection({ x: -1, y: 0 });
  const turnRight = () => direction.x === 0 && setDirection({ x: 1, y: 0 });

  return (
    <div className="flex flex-col items-center justify-center p-6 glass-panel rounded-2xl relative overflow-hidden group">
      
      {/* Dynamic glow corner lights */}
      <div 
        className="absolute -top-12 -left-12 w-48 h-48 rounded-full filter blur-[80px] opacity-25 transition-all duration-700"
        style={{ backgroundColor: getThemeColor() }}
      />
      <div 
        className="absolute -bottom-12 -right-12 w-48 h-48 rounded-full filter blur-[80px] opacity-25 transition-all duration-700"
        style={{ backgroundColor: getSecondaryThemeColor() }}
      />

      {/* Header bar and stats */}
      <div className="w-full flex items-center justify-between mb-4 z-10">
        <div className="flex items-center space-x-2">
          <Gamepad2 className="w-5 h-5 animate-pulse" style={{ color: getThemeColor() }} />
          <span className="font-mono text-sm tracking-wider uppercase font-semibold text-zinc-300">
            Grid Viewport
          </span>
          {gameState === "playing" && (
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: getThemeColor() }}></span>
              <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: getThemeColor() }}></span>
            </span>
          )}
        </div>
        
        {/* Speed Indicator */}
        <div className="flex items-center space-x-3 text-xs font-mono text-zinc-500 bg-black/40 px-3 py-1.5 rounded-full border border-white/10">
          <Sparkles className="w-3.5 h-3.5" style={{ color: getThemeColor() }} />
          <span>Grid Speed: <span className="text-zinc-200 font-bold">{Math.round(1000 / speedMs)} ticks/s</span></span>
        </div>
      </div>

      {/* Main Screen Stage */}
      <div className="relative border-4 border-black/40 rounded-2xl overflow-hidden shadow-2xl bg-zinc-950">
        
        {/* Snake Interactive Screen Area */}
        <canvas
          id="snake_viewport"
          ref={canvasRef}
          width={22 * 18} // 22x22 cells of 18px = 396px
          height={22 * 18}
          className="block rounded-lg transition-all duration-300"
          style={{
            boxShadow: gameState === "playing" ? `inset 0 0 20px rgba(${hexToRgb(getThemeColor())}, 0.15)` : "none",
          }}
        />

        {/* Overlay screens: Start / Pause / GameOver / Idle */}
        {gameState !== "playing" && (
          <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 z-20">
            {gameState === "idle" && (
              <div className="space-y-4 animate-fade-in">
                <div 
                  className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center border border-zinc-800 bg-zinc-900 shadow-md transform group-hover:scale-105 transition-all duration-300"
                  style={{ boxShadow: `0 0 20px ${getThemeColor()}33` }}
                >
                  <Gamepad2 className="w-9 h-9" style={{ color: getThemeColor() }} />
                </div>
                <h3 className="text-2xl font-sans font-bold text-white tracking-tight">
                  Snake Arcade Engine
                </h3>
                <p className="text-xs text-zinc-400 max-w-sm">
                  Eat synth cells, avoid grid limits, and coordinate moves with the tempo of <span className="text-zinc-200 font-semibold">{activeTrack.title}</span>.
                </p>
                <button
                  id="btn_start_game"
                  onClick={startGame}
                  className="px-6 py-2.5 rounded-xl font-mono text-xs font-semibold uppercase tracking-wider text-black transition-all hover:scale-105 active:scale-95 flex items-center space-x-2 mx-auto cursor-pointer"
                  style={{
                    backgroundColor: getThemeColor(),
                    boxShadow: `0 0 25px ${getThemeColor()}aa`,
                  }}
                >
                  <Play className="w-4 h-4 fill-black" />
                  <span>Enter Grid (Space)</span>
                </button>
              </div>
            )}

            {gameState === "paused" && (
              <div className="space-y-4">
                <div className="w-12 h-12 mx-auto rounded-full flex items-center justify-center border border-zinc-700 bg-zinc-800">
                  <Pause className="w-6 h-6 text-zinc-400" />
                </div>
                <h3 className="text-xl font-sans font-bold text-white">Grid Suspended</h3>
                <p className="text-xs text-zinc-400">Tempo paused. Ready whenever you are.</p>
                <button
                  id="btn_resume_game"
                  onClick={startGame}
                  className="px-5 py-2.5 rounded-xl font-mono text-xs font-semibold uppercase tracking-wider text-black cursor-pointer"
                  style={{
                    backgroundColor: getThemeColor(),
                    boxShadow: `0 0 20px ${getThemeColor()}88`,
                  }}
                >
                  Resume Grid
                </button>
              </div>
            )}

            {gameState === "gameover" && (
              <div className="space-y-4 animate-bounce-subtle">
                <div className="w-14 h-14 mx-auto rounded-2xl flex items-center justify-center border border-rose-500/30 bg-rose-950/20 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                  <RotateCcw className="w-7 h-7 text-rose-500" />
                </div>
                <h3 className="text-2xl font-sans font-bold text-rose-500 tracking-tight">
                  Grid Crash detected!
                </h3>
                <p className="text-xs text-zinc-400">
                  You scored <span className="text-white font-bold text-sm bg-zinc-900 px-2 py-0.5 rounded-md border border-zinc-800">{score}</span> points.
                </p>
                <button
                  id="btn_restart_game"
                  onClick={startGame}
                  className="px-5 py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider text-black transition-all hover:scale-105 active:scale-95 flex items-center space-x-2 mx-auto cursor-pointer"
                  style={{
                    backgroundColor: getThemeColor(),
                    boxShadow: `0 0 25px ${getThemeColor()}88`,
                  }}
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Restart Grid</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Retro D-Pad Controller Console (Perfect for mouse/touch inputs & beautiful visual aesthetics!) */}
      <div className="mt-5 w-full max-w-xs flex flex-col items-center">
        <div className="grid grid-cols-3 gap-2 w-40">
          <div />
          <button
            id="control_pad_up"
            onClick={turnUp}
            disabled={gameState !== "playing"}
            className="w-12 h-12 bg-black/40 hover:bg-white/5 active:scale-95 border border-white/10 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
            title="W or Up Arrow"
          >
            <ArrowUp className="w-5 h-5" />
          </button>
          <div />

          <button
            id="control_pad_left"
            onClick={turnLeft}
            disabled={gameState !== "playing"}
            className="w-12 h-12 bg-black/40 hover:bg-white/5 active:scale-95 border border-white/10 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
            title="A or Left Arrow"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          {/* Pause Trigger on Center Button */}
          <button
            id="control_pad_center"
            onClick={() => (gameState === "playing" ? pauseGame() : startGame())}
            className="w-12 h-12 bg-black/40 border border-white/10 rounded-xl flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-all cursor-pointer"
            title={gameState === "playing" ? "Pause Match" : "Resume Tracker"}
          >
            {gameState === "playing" ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 fill-zinc-500" />}
          </button>
          <button
            id="control_pad_right"
            onClick={turnRight}
            disabled={gameState !== "playing"}
            className="w-12 h-12 bg-black/40 hover:bg-white/5 active:scale-95 border border-white/10 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
            title="D or Right Arrow"
          >
            <ArrowRight className="w-5 h-5" />
          </button>

          <div />
          <button
            id="control_pad_down"
            onClick={turnDown}
            disabled={gameState !== "playing"}
            className="w-12 h-12 bg-black/40 hover:bg-white/5 active:scale-95 border border-white/10 rounded-xl flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-all cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
            title="S or Down Arrow"
          >
            <ArrowDown className="w-5 h-5" />
          </button>
          <div />
        </div>
        <p className="text-[10px] text-zinc-600 font-mono mt-3 uppercase tracking-wider text-center">
          Move with <span className="text-zinc-400 font-semibold">WASD</span>, <span className="text-zinc-400 font-semibold">Arrows</span> or console pads
        </p>
      </div>

    </div>
  );
}
