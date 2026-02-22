export type ItemType = "lifeCard" | "nudge" | "playbook";

export interface LifeCardContent {
  title?: string;
  phrase: string;
  imageUrl?: string;
}

export interface NudgeContent {
  text: string;
  /** 画像（任意）。一覧サムネイル・表示画面で使用。 */
  imageUrl?: string;
}

export interface PlaybookContent {
  title: string;
  steps: string[];
  /** 画像（任意）。一覧サムネイル・表示画面で使用。 */
  imageUrl?: string;
}

export interface ItemStats {
  yesCount: number;
  noCount: number;
  skipCount: number;
  displayCount: number;
  lastDeliveredAt?: number;
}

export interface ActiveItem {
  id: string;
  type: ItemType;
  createdAt: number;
  updatedAt: number;
  stats: ItemStats;
  content: LifeCardContent | NudgeContent | PlaybookContent;
  /** タグ（カテゴリ）。任意。未設定は [] として扱う。 */
  tags?: string[];
}

export interface DeleteBoxItem extends ActiveItem {
  deletedAt: number;
}

export interface DeliveryRecord {
  id: string;
  itemId: string;
  deliveredAt: number;
  feedbackAsked: boolean;
  feedbackGiven?: "YES" | "NO" | "SKIP";
}

export interface AppState {
  activeItems: ActiveItem[];
  deleteBox: DeleteBoxItem[];
  deliveries: DeliveryRecord[];
  lastDeliveredItemId?: string;
  lastDeliveryId?: string;
}

/**
 * 通知スケジュール用の簡易モデル（ステップ3〜4）。
 * Phase 1 の「月・水・金 9:00」は別レイヤとして、将来的にこのモデルで表現する想定。
 */
export interface NotificationSchedule {
  id: string;
  /** 0–23 */
  hour: number;
  /** 0–59 */
  minute: number;
  /** 1=日 … 7=土。空なら「毎日」の解釈も可 */
  weekdays: number[];
  enabled: boolean;
}

export function getItemTitle(item: ActiveItem): string {
  switch (item.type) {
    case "lifeCard":
      return (item.content as LifeCardContent).title || (item.content as LifeCardContent).phrase;
    case "nudge":
      return (item.content as NudgeContent).text;
    case "playbook":
      return (item.content as PlaybookContent).title;
  }
}

export function getItemMainText(item: ActiveItem): string {
  switch (item.type) {
    case "lifeCard":
      return (item.content as LifeCardContent).phrase;
    case "nudge":
      return (item.content as NudgeContent).text;
    case "playbook":
      return (item.content as PlaybookContent).title;
  }
}

export function getTypeLabel(type: ItemType): string {
  switch (type) {
    case "lifeCard": return "Life Card";
    case "nudge": return "Nudge";
    case "playbook": return "Playbook";
  }
}

/** アイテムのタグ一覧。未設定は空配列。 */
export function getItemTags(item: ActiveItem): string[] {
  return item.tags ?? [];
}

/** 一覧サムネイル用。画像があれば URL、なければ undefined。 */
export function getItemImageUrl(item: ActiveItem): string | undefined {
  switch (item.type) {
    case "lifeCard":
      return (item.content as LifeCardContent).imageUrl;
    case "nudge":
      return (item.content as NudgeContent).imageUrl;
    case "playbook":
      return (item.content as PlaybookContent).imageUrl;
  }
}
