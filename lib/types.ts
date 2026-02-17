export type ItemType = "lifeCard" | "nudge" | "playbook";

export interface LifeCardContent {
  title?: string;
  phrase: string;
  imageUrl?: string;
}

export interface NudgeContent {
  text: string;
}

export interface PlaybookContent {
  title: string;
  steps: string[];
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
