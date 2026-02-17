import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
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
    content: LifeCardContent | NudgeContent | PlaybookContent
  ) => ActiveItem;
  updateItem: (
    id: string,
    content: LifeCardContent | NudgeContent | PlaybookContent
  ) => void;
  deleteItem: (id: string) => void;
  permanentDelete: (id: string) => void;
  restoreItem: (id: string) => ActiveItem | null;
  replaceAndAdd: (
    oldId: string,
    type: ItemType,
    content: LifeCardContent | NudgeContent | PlaybookContent
  ) => ActiveItem;
  replaceAndRestore: (oldId: string, restoreId: string) => ActiveItem | null;
  simulateDelivery: () => {
    item: ActiveItem | null;
    delivery: DeliveryRecord | null;
  };
  recordFeedback: (
    deliveryId: string,
    feedback: "YES" | "NO" | "SKIP"
  ) => { shouldPromptDelete: boolean };
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

  useEffect(() => {
    loadState().then((s) => {
      const cleaned = cleanDeleteBox(s);
      setState(cleaned);
      setIsLoading(false);
      saveState(cleaned);
    });
  }, []);

  const persist = useCallback((newState: AppState) => {
    setState(newState);
    saveState(newState);
  }, []);

  function cleanDeleteBox(s: AppState): AppState {
    const now = Date.now();
    const filtered = s.deleteBox.filter(
      (it) => now - it.deletedAt < DELETE_BOX_RETENTION_MS
    );
    return { ...s, deleteBox: filtered };
  }

  const addItem = useCallback(
    (
      type: ItemType,
      content: LifeCardContent | NudgeContent | PlaybookContent
    ): ActiveItem => {
      const newItem: ActiveItem = {
        id: generateId(),
        type,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        stats: {
          yesCount: 0,
          noCount: 0,
          skipCount: 0,
          displayCount: 0,
        },
        content,
      };
      const newState = {
        ...state,
        activeItems: [...state.activeItems, newItem],
      };
      persist(newState);
      return newItem;
    },
    [state, persist]
  );

  const updateItem = useCallback(
    (
      id: string,
      content: LifeCardContent | NudgeContent | PlaybookContent
    ) => {
      const newItems = state.activeItems.map((it) =>
        it.id === id ? { ...it, content, updatedAt: Date.now() } : it
      );
      persist({ ...state, activeItems: newItems });
    },
    [state, persist]
  );

  const deleteItem = useCallback(
    (id: string) => {
      const item = state.activeItems.find((it) => it.id === id);
      if (!item) return;
      const deletedItem: DeleteBoxItem = { ...item, deletedAt: Date.now() };
      const newState = {
        ...state,
        activeItems: state.activeItems.filter((it) => it.id !== id),
        deleteBox: [...state.deleteBox, deletedItem],
      };
      persist(newState);
    },
    [state, persist]
  );

  const permanentDelete = useCallback(
    (id: string) => {
      persist({
        ...state,
        deleteBox: state.deleteBox.filter((it) => it.id !== id),
      });
    },
    [state, persist]
  );

  const restoreItem = useCallback(
    (id: string): ActiveItem | null => {
      const item = state.deleteBox.find((it) => it.id === id);
      if (!item) return null;
      const { deletedAt, ...restored } = item;
      const restoredItem: ActiveItem = { ...restored, updatedAt: Date.now() };
      const newState = {
        ...state,
        activeItems: [...state.activeItems, restoredItem],
        deleteBox: state.deleteBox.filter((it) => it.id !== id),
      };
      persist(newState);
      return restoredItem;
    },
    [state, persist]
  );

  const replaceAndAdd = useCallback(
    (
      oldId: string,
      type: ItemType,
      content: LifeCardContent | NudgeContent | PlaybookContent
    ): ActiveItem => {
      const oldItem = state.activeItems.find((it) => it.id === oldId);
      let newDeleteBox = [...state.deleteBox];
      if (oldItem) {
        newDeleteBox.push({ ...oldItem, deletedAt: Date.now() });
      }
      const newItem: ActiveItem = {
        id: generateId(),
        type,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        stats: {
          yesCount: 0,
          noCount: 0,
          skipCount: 0,
          displayCount: 0,
        },
        content,
      };
      const newActive = state.activeItems
        .filter((it) => it.id !== oldId)
        .concat(newItem);
      persist({
        ...state,
        activeItems: newActive,
        deleteBox: newDeleteBox,
      });
      return newItem;
    },
    [state, persist]
  );

  const replaceAndRestore = useCallback(
    (oldId: string, restoreId: string): ActiveItem | null => {
      const oldItem = state.activeItems.find((it) => it.id === oldId);
      const restoreItem_ = state.deleteBox.find((it) => it.id === restoreId);
      if (!restoreItem_) return null;

      let newDeleteBox = state.deleteBox.filter((it) => it.id !== restoreId);
      if (oldItem) {
        newDeleteBox.push({ ...oldItem, deletedAt: Date.now() });
      }

      const { deletedAt, ...restored } = restoreItem_;
      const restoredItem: ActiveItem = { ...restored, updatedAt: Date.now() };

      const newActive = state.activeItems
        .filter((it) => it.id !== oldId)
        .concat(restoredItem);

      persist({
        ...state,
        activeItems: newActive,
        deleteBox: newDeleteBox,
      });
      return restoredItem;
    },
    [state, persist]
  );

  const simulateDelivery = useCallback(() => {
    const item = selectNextItem(state.activeItems);
    if (!item) return { item: null, delivery: null };

    const newDisplayCount = item.stats.displayCount + 1;
    const askFeedback = shouldAskFeedback(newDisplayCount);
    const delivery = createDeliveryRecord(item.id, askFeedback);

    const updatedItems = state.activeItems.map((it) =>
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

    const updatedItem = updatedItems.find((it) => it.id === item.id)!;

    const newState = {
      ...state,
      activeItems: updatedItems,
      deliveries: [...state.deliveries, delivery],
      lastDeliveredItemId: item.id,
      lastDeliveryId: delivery.id,
    };
    persist(newState);
    return { item: updatedItem, delivery };
  }, [state, persist]);

  const recordFeedback = useCallback(
    (
      deliveryId: string,
      feedback: "YES" | "NO" | "SKIP"
    ): { shouldPromptDelete: boolean } => {
      const delivery = state.deliveries.find((d) => d.id === deliveryId);
      if (!delivery) return { shouldPromptDelete: false };

      const newDeliveries = state.deliveries.map((d) =>
        d.id === deliveryId ? { ...d, feedbackGiven: feedback } : d
      );

      let shouldPromptDelete = false;
      const newItems = state.activeItems.map((it) => {
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

      persist({
        ...state,
        activeItems: newItems,
        deliveries: newDeliveries,
      });
      return { shouldPromptDelete };
    },
    [state, persist]
  );

  const getLastDelivery = useCallback(() => {
    if (!state.lastDeliveryId || !state.lastDeliveredItemId) {
      return { item: null, delivery: null };
    }
    const delivery =
      state.deliveries.find((d) => d.id === state.lastDeliveryId) || null;
    const item =
      state.activeItems.find((it) => it.id === state.lastDeliveredItemId) ||
      null;
    return { item, delivery };
  }, [state]);

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
