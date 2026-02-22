import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import type { ActiveItem } from "./types";
import { getItemMainText, getItemTitle } from "./types";
import { selectTodayItem, getTodayDateString } from "./widget";

/** 「今日の1枚」1回通知の識別子。同一 ID で上書き・キャンセルする。 */
export const TODAY_ONE_SHOT_IDENTIFIER = "today-one-shot";

/** ステップ3: 「今日の1枚」の1回通知のデフォルト時刻（21:00）。 */
export const TODAY_ONE_SHOT_DEFAULT_HOUR = 21;
export const TODAY_ONE_SHOT_DEFAULT_MINUTE = 0;

/**
 * 今日の日付で 21:00 の Date（ローカル）を返す。
 */
function getTodayAt(hour: number, minute: number): Date {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d;
}

/**
 * 「次の1回だけ」のローカル通知を、今日の「今日の1枚」に紐づけて登録する。
 * アプリ起動時・フォアグラウンド復帰時に呼ぶ想定。
 * - 通知権限がなければ何もしない
 * - アイテムがなければ何もしない
 * - 今日の 21:00 を過ぎていれば何もしない
 */
export async function scheduleTodayOneShot(
  activeItems: ActiveItem[]
): Promise<void> {
  if (Platform.OS === "web") return;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== "granted") return;

  const today = getTodayDateString();
  const item = selectTodayItem(activeItems, today);
  if (!item) return;

  const fireAt = getTodayAt(TODAY_ONE_SHOT_DEFAULT_HOUR, TODAY_ONE_SHOT_DEFAULT_MINUTE);
  if (Date.now() >= fireAt.getTime()) return;

  await Notifications.cancelScheduledNotificationAsync(TODAY_ONE_SHOT_IDENTIFIER);

  const title = getItemTitle(item);
  const body = getItemMainText(item);
  const bodyShort = body.length > 80 ? `${body.slice(0, 77)}…` : body;

  await Notifications.scheduleNotificationAsync({
    identifier: TODAY_ONE_SHOT_IDENTIFIER,
    content: {
      title: title ? `Life Hack Reminder: ${title}` : "Life Hack Reminder",
      body: bodyShort,
      data: {
        itemId: item.id,
      },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: fireAt,
    },
  });
}
