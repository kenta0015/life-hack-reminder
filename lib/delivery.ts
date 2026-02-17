import * as Crypto from "expo-crypto";
import type { ActiveItem, DeliveryRecord } from "./types";

// --- Cooldown table ---
// noCount=1 → 5 days, noCount=2 → 7 days, noCount=3 → 9 days, noCount>=4 → 11 days
function getCooldownDays(noCount: number): number {
  if (noCount <= 0) return 0;
  if (noCount === 1) return 5;
  if (noCount === 2) return 7;
  if (noCount === 3) return 9;
  return 11;
}

const MS_PER_DAY = 86400000;

// --- Eligibility: excluded if still in NO cooldown ---
function isEligible(item: ActiveItem, now: number): boolean {
  const cooldownDays = getCooldownDays(item.stats.noCount);
  if (cooldownDays === 0) return true;
  if (!item.stats.lastDeliveredAt) return true;
  return now >= item.stats.lastDeliveredAt + cooldownDays * MS_PER_DAY;
}

// --- Scoring ---
// baseScore = yesCount
// effectiveScore = baseScore - 0.25 * skipCount
function effectiveScore(item: ActiveItem): number {
  return item.stats.yesCount - 0.25 * item.stats.skipCount;
}

// --- Select the next item to deliver ---
export function selectNextItem(items: ActiveItem[]): ActiveItem | null {
  const now = Date.now();
  const eligible = items.filter((it) => isEligible(it, now));
  if (eligible.length === 0) return null;

  eligible.sort((a, b) => effectiveScore(b) - effectiveScore(a));

  const topScore = effectiveScore(eligible[0]);
  const topGroup = eligible.filter((it) => effectiveScore(it) === topScore);

  return topGroup[Math.floor(Math.random() * topGroup.length)];
}

// --- Should we ask feedback this time? (every 3rd display) ---
export function shouldAskFeedback(displayCountAfterIncrement: number): boolean {
  return displayCountAfterIncrement % 3 === 0;
}

// --- Create delivery record ---
export function createDeliveryRecord(
  itemId: string,
  feedbackAsked: boolean
): DeliveryRecord {
  return {
    id: Crypto.randomUUID(),
    itemId,
    deliveredAt: Date.now(),
    feedbackAsked,
  };
}

// --- Cooldown info for display ---
export function getCooldownInfo(item: ActiveItem): {
  isCoolingDown: boolean;
  remainingDays: number;
  cooldownEndDate?: Date;
} {
  const cooldownDays = getCooldownDays(item.stats.noCount);
  if (cooldownDays === 0 || !item.stats.lastDeliveredAt) {
    return { isCoolingDown: false, remainingDays: 0 };
  }
  const endMs = item.stats.lastDeliveredAt + cooldownDays * MS_PER_DAY;
  const now = Date.now();
  if (now >= endMs) {
    return { isCoolingDown: false, remainingDays: 0 };
  }
  const remaining = Math.ceil((endMs - now) / MS_PER_DAY);
  return {
    isCoolingDown: true,
    remainingDays: remaining,
    cooldownEndDate: new Date(endMs),
  };
}

export function generateId(): string {
  return Crypto.randomUUID();
}
