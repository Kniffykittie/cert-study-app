'use client'
import { useState, useEffect } from 'react'

// Life Hub section identity colors, per theme. Returned as hex strings so the
// pervasive `${color}22` alpha-tint concatenation pattern keeps working.
// Keys: overview / goals / health / nutrition / workouts.
export const SECTION_PALETTES = {
  villainous: { overview: '#a78bfa', goals: '#06b6d4', health: '#22c55e', nutrition: '#f97316', workouts: '#3b82f6' },
  midnight:   { overview: '#818cf8', goals: '#22d3ee', health: '#34d399', nutrition: '#fb923c', workouts: '#38bdf8' },
  amethyst:   { overview: '#c084fc', goals: '#e879f9', health: '#a78bfa', nutrition: '#f0abfc', workouts: '#a855f7' },
  slate:      { overview: '#94a3b8', goals: '#7dd3fc', health: '#86efac', nutrition: '#fdba74', workouts: '#60a5fa' },
  rosegold:   { overview: '#f0c9a0', goals: '#e0a899', health: '#f9a8d4', nutrition: '#fca5a5', workouts: '#eab5c5' },
  acid:       { overview: '#d9f99d', goals: '#a3e635', health: '#4ade80', nutrition: '#bef264', workouts: '#22d3ee' },
  sunshine:   { overview: '#fde047', goals: '#fbbf24', health: '#a3e635', nutrition: '#fb923c', workouts: '#38bdf8' },
  bubblegum:  { overview: '#f0abfc', goals: '#f472b6', health: '#fda4af', nutrition: '#fb7185', workouts: '#c084fc' },
}

export const DEFAULT_SECTION = SECTION_PALETTES.villainous

export function getThemeKey() {
  if (typeof document === 'undefined') return 'villainous'
  return document.documentElement.getAttribute('data-theme') || 'villainous'
}

export function sectionColorsFor(themeKey) {
  return SECTION_PALETTES[themeKey] || DEFAULT_SECTION
}

// Live section palette. Defaults to villainous for SSR/first paint, then
// syncs to the active theme and updates whenever the theme changes (the
// ThemePicker dispatches a 'themechange' event on selection).
export function useSectionColors() {
  const [key, setKey] = useState('villainous')
  useEffect(() => {
    const sync = () => setKey(getThemeKey())
    sync()
    window.addEventListener('themechange', sync)
    return () => window.removeEventListener('themechange', sync)
  }, [])
  return sectionColorsFor(key)
}
