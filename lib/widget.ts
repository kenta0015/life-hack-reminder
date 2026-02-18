import type { ActiveItem, ItemType, LifeCardContent, PlaybookContent } from "./types";
import { getItemMainText, getItemTitle, getItemImageUrl } from "./types";

/** 日付文字列（YYYY-MM-DD）から数値シードを生成。同じ日付なら同じシード。 */
function hashDateString(dateYYYYMMDD: string): number {
  let h = 0;
  for (let i = 0; i < dateYYYYMMDD.length; i++) {
    h = (h << 5) - h + dateYYYYMMDD.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

/** シード付き簡易 PRNG（mulberry32）。同じシードなら同じ列。 */
function createSeededRandom(seed: number): () => number {
  return function next() {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 日付ベースで「今日の1枚」を1件選ぶ。
 * 同じ日付なら常に同じ1件になる（シード付きシャッフルで先頭を採用）。
 * @param items 有効なアイテム一覧（activeItems）
 * @param dateYYYYMMDD 日付（デバイスローカル想定）例: "2026-02-18"
 */
export function selectTodayItem(
  items: ActiveItem[],
  dateYYYYMMDD: string
): ActiveItem | null {
  if (items.length === 0) return null;
  if (items.length === 1) return items[0];

  const seed = hashDateString(dateYYYYMMDD);
  const random = createSeededRandom(seed);
  const shuffled = [...items];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled[0];
}

/**
 * ウィジェット用にネイティブへ渡すペイロード。
 * imageUri はネイティブ側で共有コンテナにコピーし、widgetImagePath として保存する。
 */
export interface WidgetPayload {
  phrase: string;
  title?: string;
  type: ItemType;
  /** 画像の元 URI。ネイティブが共有コンテナにコピーして widgetImagePath を書き出す。 */
  imageUri?: string;
  updatedAt: number;
}

/** デバイスローカルの「今日」を YYYY-MM-DD で返す。 */
export function getTodayDateString(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * 選ばれた1件からウィジェット用ペイロードを組み立てる。
 */
export function buildWidgetPayload(item: ActiveItem): WidgetPayload {
  const phrase = getItemMainText(item);
  const imageUri = getItemImageUrl(item);
  let title: string | undefined;

  switch (item.type) {
    case "lifeCard":
      title = (item.content as LifeCardContent).title || undefined;
      break;
    case "playbook":
      // Playbook の title は phrase と同じなので、サブ表示用には空でもよい
      title = (item.content as PlaybookContent).title;
      if (title === phrase) title = undefined;
      break;
    default:
      title = undefined;
  }

  return {
    phrase,
    title,
    type: item.type,
    imageUri,
    updatedAt: Date.now(),
  };
}
