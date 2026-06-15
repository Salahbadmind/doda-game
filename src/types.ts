/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Track {
  id: string;
  title: string;
  artist: string;
  genre: string;
  bpm: number;
  description: string;
  color: string; // Tailwind color name for specific visual glow (e.g., 'emerald', 'fuchsia', 'cyan')
}

export interface SnakeSegment {
  x: number;
  y: number;
}

export interface GameStats {
  score: number;
  highScore: number;
  snakeLength: number;
  speedLevel: number;
  applesEaten: number;
}

export interface HighScoreEntry {
  name: string;
  score: number;
  date: string;
  level: number;
}
