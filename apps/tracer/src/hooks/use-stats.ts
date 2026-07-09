"use client";

import { applyDecay, defaultStats, loadStats, saveStats } from "@/lib/stats";
import type { CharacterStats } from "@/lib/stats";
import { useEffect, useState } from "react";

export function useStats() {
  const [stats, setStats] = useState<CharacterStats>(() => {
    const loaded = loadStats();
    const decayed = applyDecay(loaded);
    saveStats(decayed);
    return decayed;
  });

  useEffect(() => {
    const id = setInterval(() => {
      setStats((prev) => {
        const updated = applyDecay(prev);
        saveStats(updated);
        return updated;
      });
    }, 10_000);
    return () => clearInterval(id);
  }, []);

  function resetStats() {
    const fresh = defaultStats();
    saveStats(fresh);
    setStats(fresh);
  }

  function spendMoney(amount: number): boolean {
    if (stats.money < amount) return false;
    const updated = { ...stats, money: stats.money - amount };
    saveStats(updated);
    setStats(updated);
    return true;
  }

  function earnMoney(amount: number): void {
    const updated = { ...stats, money: stats.money + amount };
    saveStats(updated);
    setStats(updated);
  }

  function restoreStats(hunger: number, thirst: number): void {
    const updated = {
      ...stats,
      hunger: Math.min(100, stats.hunger + hunger),
      thirst: Math.min(100, stats.thirst + thirst),
    };
    saveStats(updated);
    setStats(updated);
  }

  return { stats, resetStats, spendMoney, earnMoney, restoreStats };
}
