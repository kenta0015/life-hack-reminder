import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { AppState as RNAppState } from "react-native";
import type {
  ActiveItem,
  DeleteBoxItem,
  DeliveryRecord,
  AppState,
  ItemType,
  LifeCardContent,
  NudgeContent,
  PlaybookContent,
} from "./types";
import { loadState, saveState } from "./storage";
import {
  selectNextItem,
  shouldAskFeedback,
  createDeliveryRecord,
  generateId,
} from "./delivery";
import {
  selectTodayItem,
  getTodayDateString,
  buildWidgetPayload,
} from "./widget";
import { writeWidgetDataToNative } from "./widgetNative";

const DELETE_BOX_RETENTION_MS = 30 * 86400000;

interface AppContextValue {
  activeItems: ActiveItem[];
  deleteBox: DeleteBoxItem[];
  deliveries: DeliveryRecord[];
  lastDeliveredItemId?: string;
  lastDeliveryId?: string;
  isLoading: boolean;

  addItem: (
    type: ItemType,
    content: LifeCardContent | NudgeContent | PlaybookContent,
    tags?: string[]
  ) => Promise<ActiveItem>;
  updateItem: (
    id: string,
    content: LifeCardContent | NudgeContent | PlaybookContent,
    tags?: string[]
  ) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  permanentDelete: (id: string) => Promise<void>;
  restoreItem: (id: string) => Promise<ActiveItem | null>;
  replaceAndAdd: (
    oldId: string,
    type: ItemType,
    content: LifeCardContent | NudgeContent | PlaybookContent,
    tags?: string[]
  ) => Promise<ActiveItem>;
  replaceAndRestore: (oldId: string, restoreId: string) => Promise<ActiveItem | null>;
  simulateDelivery: () => Promise<{
    item: ActiveItem | null;
    delivery: DeliveryRecord | null;
  }>;
  recordFeedback: (
    deliveryId: string,
    feedback: "YES" | "NO" | "SKIP"
  ) => Promise<{ shouldPromptDelete: boolean }>;
  reduceNoCount: (itemId: string) => Promise<void>;
  getLastDelivery: () => {
    item: ActiveItem | null;
    delivery: DeliveryRecord | null;
  };
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({
    activeItems: [],
    deleteBox: [],
    deliveries: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const latestStateRef = useRef<AppState>(state);

  useEffect(() => {
    latestStateRef.current = state;
  }, [state]);

  function syncWidgetData(activeItems: ActiveItem[]) {
    const today = getTodayDateString();
    const item = selectTodayItem(activeItems, today);
    if (item) {
      const payload = buildWidgetPayload(item);
      writeWidgetDataToNative(payload).catch(() => {});
    }
  }

  useEffect(() => {
    loadState().then((s) => {
      const cleaned = cleanDeleteBox(s);
      setState(cleaned);
      latestStateRef.current = cleaned;
      setIsLoading(false);
      saveState(cleaned);
      syncWidgetData(cleaned.activeItems);
    });
  }, []);

  useEffect(() => {
    const sub = RNAppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        syncWidgetData(latestStateRef.current.activeItems);
      }
    });
    return () => sub.remove();
  }, []);

  const updateAndSave = useCallback(async (updater: (prev: AppState) => AppState): Promise<AppState> => {
    const cur = latestStateRef.current;
    const next = updater(cur);
    const nextCleaned = cleanDeleteBox(next);
    latestStateRef.current = nextCleaned;
    setState(nextCleaned);
    await saveState(nextCleaned);
    syncWidgetData(nextCleaned.activeItems);
    return nextCleaned;
  }, []);

  function cleanDeleteBox(s: AppState): AppState {
    const now = Date.now();
    const filtered = s.deleteBox.filter(
      (it) => now - it.deletedAt < DELETE_BOX_RETENTION_MS
    );
    return { ...s, deleteBox: filtered };
  }

  const addItem = useCallback(
    async (
      type: ItemType,
      content: LifeCardContent | NudgeContent | PlaybookContent,
      tags?: string[]
    ): Promise<ActiveItem> => {
      const newItem: ActiveItem = {
        id: generateId(),
        type,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        stats: { yesCount: 0, noCount: 0, skipCount: 0, displayCount: 0 },
        content,
        tags: tags && tags.length > 0 ? tags : undefined,
      };
      await updateAndSave((prev) => ({
        ...prev,
        activeItems: [...prev.activeItems, newItem],
      }));
      return newItem;
    },
    [updateAndSave]
  );

  const updateItem = useCallback(
    async (
      id: string,
      content: LifeCardContent | NudgeContent | PlaybookContent,
      tags?: string[]
    ) => {
      await updateAndSave((prev) => ({
        ...prev,
        activeItems: prev.activeItems.map((it) =>
          it.id === id
            ? {
                ...it,
                content,
                updatedAt: Date.now(),
                tags: tags && tags.length > 0 ? tags : undefined,
              }
            : it
        ),
      }));
    },
    [updateAndSave]
  );

  const deleteItem = useCallback(
    async (id: string) => {
      await updateAndSave((prev) => {
        const item = prev.activeItems.find((it) => it.id === id);
        if (!item) return prev;
        return {
          ...prev,
          activeItems: prev.activeItems.filter((it) => it.id !== id),
          deleteBox: [...prev.deleteBox, { ...item, deletedAt: Date.now() }],
        };
      });
    },
    [updateAndSave]
  );

  const permanentDelete = useCallback(
    async (id: string) => {
      await updateAndSave((prev) => ({
        ...prev,
        deleteBox: prev.deleteBox.filter((it) => it.id !== id),
      }));
    },
    [updateAndSave]
  );

  const restoreItem = useCallback(
    async (id: string): Promise<ActiveItem | null> => {
      let restoredItem: ActiveItem | null = null;
      await updateAndSave((prev) => {
        const item = prev.deleteBox.find((it) => it.id === id);
        if (!item) return prev;
        const { deletedAt, ...rest } = item;
        restoredItem = {
          ...rest,
          updatedAt: Date.now(),
          stats: { yesCount: 0, noCount: 0, skipCount: 0, displayCount: 0 },
        };
        return {
          ...prev,
          activeItems: [...prev.activeItems, restoredItem!],
          deleteBox: prev.deleteBox.filter((it) => it.id !== id),
        };
      });
      return restoredItem;
    },
    [updateAndSave]
  );

  const replaceAndAdd = useCallback(
    async (
      oldId: string,
      type: ItemType,
      content: LifeCardContent | NudgeContent | PlaybookContent,
      tags?: string[]
    ): Promise<ActiveItem> => {
      const newItem: ActiveItem = {
        id: generateId(),
        type,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        stats: { yesCount: 0, noCount: 0, skipCount: 0, displayCount: 0 },
        content,
        tags: tags && tags.length > 0 ? tags : undefined,
      };
      await updateAndSave((prev) => {
        const oldItem = prev.activeItems.find((it) => it.id === oldId);
        const newDeleteBox = oldItem
          ? [...prev.deleteBox, { ...oldItem, deletedAt: Date.now() }]
          : [...prev.deleteBox];
        return {
          ...prev,
          activeItems: prev.activeItems.filter((it) => it.id !== oldId).concat(newItem),
          deleteBox: newDeleteBox,
        };
      });
      return newItem;
    },
    [updateAndSave]
  );

  const replaceAndRestore = useCallback(
    async (oldId: string, restoreId: string): Promise<ActiveItem | null> => {
      let restoredItem: ActiveItem | null = null;
      await updateAndSave((prev) => {
        const oldItem = prev.activeItems.find((it) => it.id === oldId);
        const restoreItem_ = prev.deleteBox.find((it) => it.id === restoreId);
        if (!restoreItem_) return prev;

        let newDeleteBox = prev.deleteBox.filter((it) => it.id !== restoreId);
        if (oldItem) {
          newDeleteBox.push({ ...oldItem, deletedAt: Date.now() });
        }
        const { deletedAt, ...rest } = restoreItem_;
        restoredItem = {
          ...rest,
          updatedAt: Date.now(),
          stats: { yesCount: 0, noCount: 0, skipCount: 0, displayCount: 0 },
        };
        return {
          ...prev,
          activeItems: prev.activeItems.filter((it) => it.id !== oldId).concat(restoredItem!),
          deleteBox: newDeleteBox,
        };
      });
      return restoredItem;
    },
    [updateAndSave]
  );

  const simulateDelivery = useCallback(async () => {
    let resultItem: ActiveItem | null = null;
    let resultDelivery: DeliveryRecord | null = null;

    await updateAndSave((prev) => {
      const item = selectNextItem(prev.activeItems);
      if (!item) return prev;

      const newDisplayCount = item.stats.displayCount + 1;
      const askFeedback = shouldAskFeedback(newDisplayCount);
      const delivery = createDeliveryRecord(item.id, askFeedback);

      const updatedItems = prev.activeItems.map((it) =>
        it.id === item.id
          ? {
              ...it,
              stats: {
                ...it.stats,
                displayCount: newDisplayCount,
                lastDeliveredAt: delivery.deliveredAt,
              },
            }
          : it
      );

      resultItem = updatedItems.find((it) => it.id === item.id)!;
      resultDelivery = delivery;

      return {
        ...prev,
        activeItems: updatedItems,
        deliveries: [...prev.deliveries, delivery],
        lastDeliveredItemId: item.id,
        lastDeliveryId: delivery.id,
      };
    });

    return { item: resultItem, delivery: resultDelivery };
  }, [updateAndSave]);

  const recordFeedback = useCallback(
    async (
      deliveryId: string,
      feedback: "YES" | "NO" | "SKIP"
    ): Promise<{ shouldPromptDelete: boolean }> => {
      let shouldPromptDelete = false;

      await updateAndSave((prev) => {
        const delivery = prev.deliveries.find((d) => d.id === deliveryId);
        if (!delivery) return prev;

        const newDeliveries = prev.deliveries.map((d) =>
          d.id === deliveryId ? { ...d, feedbackGiven: feedback } : d
        );

        const newItems = prev.activeItems.map((it) => {
          if (it.id !== delivery.itemId) return it;
          const stats = { ...it.stats };
          if (feedback === "YES") {
            stats.yesCount++;
            if (stats.noCount > 0) stats.noCount--;
          } else if (feedback === "NO") {
            stats.noCount++;
            if (stats.noCount >= 5) shouldPromptDelete = true;
          } else {
            stats.skipCount++;
          }
          return { ...it, stats };
        });

        return {
          ...prev,
          activeItems: newItems,
          deliveries: newDeliveries,
        };
      });

      return { shouldPromptDelete };
    },
    [updateAndSave]
  );

  const reduceNoCount = useCallback(async (itemId: string) => {
    await updateAndSave((prev) => ({
      ...prev,
      activeItems: prev.activeItems.map((it) =>
        it.id === itemId
          ? {
              ...it,
              stats: {
                ...it.stats,
                noCount: Math.max(0, it.stats.noCount - 1),
              },
            }
          : it
      ),
    }));
  }, [updateAndSave]);

  const getLastDelivery = useCallback(() => {
    const cur = latestStateRef.current;
    if (!cur.lastDeliveryId || !cur.lastDeliveredItemId) {
      return { item: null, delivery: null };
    }
    const delivery = cur.deliveries.find((d) => d.id === cur.lastDeliveryId) || null;
    const item = cur.activeItems.find((it) => it.id === cur.lastDeliveredItemId) || null;
    return { item, delivery };
  }, []);

  const value = useMemo(
    () => ({
      activeItems: state.activeItems,
      deleteBox: state.deleteBox,
      deliveries: state.deliveries,
      lastDeliveredItemId: state.lastDeliveredItemId,
      lastDeliveryId: state.lastDeliveryId,
      isLoading,
      addItem,
      updateItem,
      deleteItem,
      permanentDelete,
      restoreItem,
      replaceAndAdd,
      replaceAndRestore,
      simulateDelivery,
      recordFeedback,
      reduceNoCount,
      getLastDelivery,
    }),
    [
      state,
      isLoading,
      addItem,
      updateItem,
      deleteItem,
      permanentDelete,
      restoreItem,
      replaceAndAdd,
      replaceAndRestore,
      simulateDelivery,
      recordFeedback,
      reduceNoCount,
      getLastDelivery,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
}
