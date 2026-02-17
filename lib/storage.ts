import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AppState } from "./types";

const STORAGE_KEY = "life_hack_reminder_state";

const defaultState: AppState = {
  activeItems: [],
  deleteBox: [],
  deliveries: [],
  lastDeliveredItemId: undefined,
  lastDeliveryId: undefined,
};

export async function loadState(): Promise<AppState> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return { ...defaultState };
  return JSON.parse(raw) as AppState;
}

export async function saveState(state: AppState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
