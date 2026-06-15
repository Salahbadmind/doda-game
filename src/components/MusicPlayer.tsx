/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from "react";
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, ListMusic, Music, Disc, RefreshCw } from "lucide-react";
import { Track } from "../types";
import { audioEngine, TRACKS } from "../audioEngine";

interface MusicPlayerProps {
  currentTrack: Track;
  onTrackChange: (track: Track) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
}

export default function MusicPlayer({
  currentTrack,
  onTrackChange,
  isPlaying,
  setIsPlaying,
}: MusicPlayerProps) {
  const visualizerCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [volume, setVolume] = useState<number>(0.5);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<number>(0);
  const animationFrameId = useRef<number | null>(null);

  // Sync step changes from audioEngine
  useEffect(() => {
    audioEngine.setOnStep((step) => {
      setActiveStep(step);
    });

    audioEngine.setOnStateChange((playing) => {
      setIsPlaying(playing);
    });
  }, [setIsPlaying]);

  // Sync state changes initially
  useEffect(() => {
    // Read actual volume
    setVolume(audioEngine.getVolume());
  }, []);

  const getThemeColor = (track: Track = currentTrack) => {
    switch (track.id) {
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

  const handlePlayPause = () => {
    const nextPlayState = audioEngine.togglePlay();
    setIsPlaying(nextPlayState);
  };

  const handleSkipForward = () => {
    const currentIndex = TRACKS.findIndex((t) => t.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % TRACKS.length;
    const nextTrack = TRACKS[nextIndex];
    
    audioEngine.setTrack(nextTrack.id);
    onTrackChange(nextTrack);
    
    if (isPlaying) {
      audioEngine.start();
    }
  };

  const handleSkipBackward = () => {
    const currentIndex = TRACKS.findIndex((t) => t.id === currentTrack.id);
    const prevIndex = (currentIndex - 1 + TRACKS.length) % TRACKS.length;
    const prevTrack = TRACKS[prevIndex];
    
    audioEngine.setTrack(prevTrack.id);
    onTrackChange(prevTrack);
    
    if (isPlaying) {
      audioEngine.start();
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
    audioEngine.setVolume(newVolume);
  };

  const handleMuteToggle = () => {
    if (isMuted) {
      audioEngine.setVolume(volume);
      setIsMuted(false);
    } else {
      audioEngine.setVolume(0);
      setIsMuted(true);
    }
  };

  const selectTrack = (track: Track) => {
    audioEngine.setTrack(track.id);
    onTrackChange(track);
    if (!isPlaying) {
      audioEngine.start();
    }
  };

  // Live Audio Visualizer Drawing Loop
  useEffect(() => {
    const canvas = visualizerCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let passiveTimer = 0;

    const drawVisualizer = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const analyser = audioEngine.getAnalyser();
      const themeColor = getThemeColor();

      if (isPlaying && analyser) {
        // Query frequency domain data from Web Audio
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        const barWidth = (canvas.width / (bufferLength * 0.7)); // display first 70% of bins (useful spectrum)
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength * 0.7; i++) {
          // Normalize volume height
          barHeight = (dataArray[i] / 255.0) * canvas.height * 1.1;

          // Multi-color neon glow bars
          const gradient = ctx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
          gradient.addColorStop(0, "rgba(24, 24, 27, 0.2)"); // zinc-900 depth
          gradient.addColorStop(0.5, themeColor);
          gradient.addColorStop(1, "#ffffff"); // white top spike glow

          ctx.fillStyle = gradient;
          ctx.beginPath();
          // Draw rounded neon column bars
          ctx.roundRect(x, canvas.height - barHeight, barWidth - 2.5, barHeight, 2.5);
          ctx.fill();

          x += barWidth;
        }
      } else {
        // Passive smooth wave animations when player is idle (looks extremely polished!)
        passiveTimer += 0.05;
        const barWidth = 6;
        const barGap = 3;
        const count = Math.floor(canvas.width / (barWidth + barGap));
        
        for (let i = 0; i < count; i++) {
          const sinValue = Math.sin(passiveTimer + i * 0.15);
          const cosValue = Math.cos(passiveTimer * 0.7 + i * 0.25);
          // Wave scale based on current step index to bounce with background clock
          const pulseScale = isPlaying ? 0.8 : 0.25;
          const height = (Math.abs(sinValue + cosValue) / 2.0) * canvas.height * pulseScale + 4;

          ctx.fillStyle = isPlaying ? themeColor : "#4b5563"; // gray-600 when totally silent
          ctx.beginPath();
          ctx.roundRect(i * (barWidth + barGap), canvas.height - height, barWidth, height, 1.5);
          ctx.fill();
        }
      }

      animationFrameId.current = requestAnimationFrame(drawVisualizer);
    };

    drawVisualizer();

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isPlaying, currentTrack]);

  return (
    <div className="flex flex-col h-full glass-panel rounded-2xl p-6 relative overflow-hidden">
      
      {/* Background ambient light */}
      <div 
        className="absolute -top-16 -right-16 w-36 h-36 rounded-full filter blur-[60px] opacity-20 transition-all duration-700"
        style={{ backgroundColor: getThemeColor() }}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <ListMusic className="w-5 h-5" style={{ color: getThemeColor() }} />
          <h2 className="font-mono text-sm uppercase tracking-wider font-semibold text-zinc-300">
            Sound Engine
          </h2>
        </div>
        <div className="flex items-center space-x-1.5 bg-black/40 px-2.5 py-1 rounded-full border border-white/10 text-[10px] font-mono text-zinc-400">
          <Disc className={`w-3.5 h-3.5 text-zinc-500 ${isPlaying ? "animate-spin" : ""}`} />
          <span>REAL-TIME SYNTH</span>
        </div>
      </div>

      {/* Album / Track Artwork Box */}
      <div className="mb-6 flex flex-col items-center">
        <div 
          className="relative w-36 h-36 rounded-2xl flex items-center justify-center overflow-hidden border border-white/10 bg-black/40 transition-all duration-500"
          style={{
            boxShadow: isPlaying ? `0 0 35px ${getThemeColor()}33` : "none",
          }}
        >
          {/* Neon spinning disc graphics */}
          <div 
            className="absolute inset-1.5 rounded-full border border-dashed border-zinc-800 opacity-80"
            style={{
              borderColor: isPlaying ? `${getThemeColor()}3a` : "#27272a",
              transform: `rotate(${activeStep * 22.5}deg)`,
              transition: "transform 0.1s linear"
            }}
          />
          <div 
            className="absolute w-24 h-24 rounded-full border-2 flex items-center justify-center"
            style={{
              borderColor: isPlaying ? getThemeColor() : "rgba(255, 255, 255, 0.15)",
              boxShadow: isPlaying ? `0 0 15px ${getThemeColor()}44, inset 0 0 15px ${getThemeColor()}44` : "none"
            }}
          >
            <Music className="w-8 h-8 transition-transform duration-300" style={{ color: getThemeColor() }} />
          </div>

          {/* Running visual steps marker (sequencer indicators) */}
          <div className="absolute bottom-2 inset-x-2 flex justify-between px-2">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((s) => (
              <span
                key={s}
                className="w-1.5 h-1.5 rounded-full transition-all duration-150"
                style={{
                  backgroundColor: activeStep % 8 === s && isPlaying ? getThemeColor() : "#27272a",
                  transform: activeStep % 8 === s && isPlaying ? "scale(1.3)" : "scale(1.0)",
                  boxShadow: activeStep % 8 === s && isPlaying ? `0 0 8px ${getThemeColor()}` : "none",
                }}
              />
            ))}
          </div>
        </div>

        <div className="text-center mt-4">
          <h3 className="text-base font-semibold text-white tracking-tight leading-tight select-none">
            {currentTrack.title}
          </h3>
          <p className="text-xs text-zinc-400 font-medium select-none mt-1">
            {currentTrack.artist} • <span className="text-xs font-mono" style={{ color: getThemeColor() }}>{currentTrack.genre}</span>
          </p>
          <p className="text-[11px] text-zinc-500 mt-2 px-3 leading-relaxed select-none h-8 italic">
            "{currentTrack.description}"
          </p>
        </div>
      </div>

      {/* Main Music Control Panel */}
      <div className="bg-black/40 border border-white/5 p-4 rounded-2xl mb-5 space-y-3 shadow-inner">
        {/* Track Progress visual animation */}
        <div className="flex items-center space-x-2">
          <span className="text-[9px] font-mono text-zinc-500 uppercase">Step</span>
          <div className="flex-1 flex gap-1 h-1.5 items-center">
            {Array.from({ length: 16 }).map((_, stepIdx) => (
              <div
                key={stepIdx}
                className="flex-1 h-full rounded transition-all duration-100"
                style={{
                  backgroundColor: stepIdx === activeStep && isPlaying
                    ? getThemeColor()
                    : stepIdx < activeStep && isPlaying
                    ? `${getThemeColor()}33`
                    : "rgba(255, 255, 255, 0.05)",
                  boxShadow: stepIdx === activeStep && isPlaying ? `0 0 8px ${getThemeColor()}` : "none"
                }}
              />
            ))}
          </div>
          <span className="text-[10px] font-mono text-zinc-400 font-semibold">{activeStep + 1}/16</span>
        </div>

        {/* Play/Skip button layout */}
        <div className="flex items-center justify-center space-x-5 py-1">
          <button
            id="audio_skip_back"
            onClick={handleSkipBackward}
            className="p-2.5 rounded-xl bg-black/40 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white active:scale-95 transition-all cursor-pointer shadow-lg"
            title="Prev synthetic track"
          >
            <SkipBack className="w-4 h-4 fill-zinc-400 hover:fill-white" />
          </button>

          <button
            id="audio_toggle_play"
            onClick={handlePlayPause}
            className="p-4 rounded-2xl text-black transition-all hover:scale-105 active:scale-95 cursor-pointer"
            style={{
              backgroundColor: getThemeColor(),
              boxShadow: `0 0 20px ${getThemeColor()}99`,
            }}
            title={isPlaying ? "Pause Synth" : "Activate Synth Audio"}
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-black text-black" />
            ) : (
              <Play className="w-5 h-5 fill-black text-black ml-0.5" />
            )}
          </button>

          <button
            id="audio_skip_forward"
            onClick={handleSkipForward}
            className="p-2.5 rounded-xl bg-black/40 border border-white/10 hover:border-white/20 text-zinc-400 hover:text-white active:scale-95 transition-all cursor-pointer shadow-lg"
            title="Next synthetic track"
          >
            <SkipForward className="w-4 h-4 fill-zinc-400 hover:fill-white" />
          </button>
        </div>

        {/* Volume section */}
        <div className="flex items-center space-x-3 pt-1">
          <button
            id="audio_mute_toggle"
            onClick={handleMuteToggle}
            className="text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400 animate-pulse" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <input
            id="audio_volume_slider"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="flex-1 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-200"
            style={{
              background: `linear-gradient(to right, ${getThemeColor()} ${Math.round((isMuted ? 0 : volume) * 100)}%, rgba(255, 255, 255, 0.05) ${Math.round((isMuted ? 0 : volume) * 100)}%)`,
            }}
          />
          <span className="text-[10px] font-mono text-zinc-500 w-8 text-right font-medium">
            {Math.round((isMuted ? 0 : volume) * 100)}%
          </span>
        </div>
      </div>

      {/* Frequency analysis board (Audio visualizer) */}
      <div className="mb-5 bg-black/40 border border-white/5 rounded-2xl p-3.5">
        <canvas
          ref={visualizerCanvasRef}
          width={240}
          height={48}
          className="w-full block rounded-lg bg-black/10"
        />
        <div className="flex justify-between text-[8px] font-mono text-zinc-600 uppercase tracking-widest mt-1.5 px-0.5">
          <span>60Hz</span>
          <span>Synth Lead Spectrum</span>
          <span>16kHz</span>
        </div>
      </div>

      {/* Playlist Grid selector */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
        <div className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase mb-1">
          Synthetic Tracks
        </div>
        {TRACKS.map((track) => {
          const isCurrent = track.id === currentTrack.id;
          const trackThemeColor = getThemeColor(track);
          return (
            <button
              key={track.id}
              onClick={() => selectTrack(track)}
              className="w-full text-left flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer hover:bg-white/5"
              style={{
                backgroundColor: isCurrent ? "rgba(255, 255, 255, 0.05)" : "transparent",
                borderColor: isCurrent ? `${trackThemeColor}44` : "transparent",
                borderLeft: isCurrent ? `4px solid ${trackThemeColor}` : "1px solid transparent",
                paddingLeft: isCurrent ? "12px" : "10px"
              }}
            >
              <div className="flex items-center space-x-3 truncate">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-mono text-xs font-semibold"
                  style={{
                    backgroundColor: isCurrent ? `${trackThemeColor}20` : "rgba(255, 255, 255, 0.05)",
                    border: `1px solid ${isCurrent ? `${trackThemeColor}44` : "rgba(255, 255, 255, 0.1)"}`,
                    color: trackThemeColor
                  }}
                >
                  {track.id === "synthwave" ? "SW" : track.id === "lofi-ambient" ? "LA" : "CT"}
                </div>
                <div className="truncate">
                  <div className="text-xs font-semibold text-zinc-200 truncate" style={{ color: isCurrent ? "#ffffff" : "#d4d4d8" }}>
                    {track.title}
                  </div>
                  <div className="text-[10px] text-zinc-500 truncate">
                    BPM: {track.bpm} • {track.genre}
                  </div>
                </div>
              </div>
              
              {isCurrent && isPlaying ? (
                <div className="flex items-end space-x-0.5 h-3">
                  <span className="w-0.5 bg-fuchsia-500 animate-pulse h-full" style={{ backgroundColor: trackThemeColor, animationDuration: "0.6s" }}></span>
                  <span className="w-0.5 bg-fuchsia-500 animate-pulse h-1/2" style={{ backgroundColor: trackThemeColor, animationDuration: "0.9s" }}></span>
                  <span className="w-0.5 bg-fuchsia-500 animate-pulse h-3/4" style={{ backgroundColor: trackThemeColor, animationDuration: "0.4s" }}></span>
                </div>
              ) : null}
            </button>
          );
        })}
      </div>

    </div>
  );
}
