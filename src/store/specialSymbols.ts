import { create } from "zustand";
import { getSpecialSymbols, saveSpecailSymbols } from "../ipc/specail_symbols";

// 特殊符号的默认列表
const DEFAULT_CUSTOM_SYMBOLS: string[] = [
  "★",
  "☆",
  "❤",
  "♡",
  "❈",
  "●",
  "○",
  "✕",
];

type SpecialSymbolsState = {
  customSymbols: string[];
  isLoading: boolean;
  isLoaded: boolean;
  loadError: string | null;
  loadCustomSymbolsIfNeeded: () => Promise<void>;
  addCustomSymbolAndPersist: (symbol: string) => Promise<void>;
  removeCustomSymbol: (index: number) => void;
  reorderCustomSymbols: (fromIndex: number, toIndex: number) => void;
};

export const useSpecialSymbolsStore = create<SpecialSymbolsState>(
  (set, get) => ({
    customSymbols: [],
    isLoading: false,
    isLoaded: false,
    loadError: null,
    loadCustomSymbolsIfNeeded: async () => {
      if (get().isLoaded || get().isLoading) {
        return;
      }

      set({ isLoading: true, loadError: null });

      try {
        const symbols = await getSpecialSymbols();

        if (symbols.length > 0) {
          set({ customSymbols: symbols });
        } else {
          set({ customSymbols: DEFAULT_CUSTOM_SYMBOLS });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        console.error("Load special symbols failed", message);

        set({
          customSymbols: DEFAULT_CUSTOM_SYMBOLS,
          loadError: message,
        });
      } finally {
        set({ isLoading: false, isLoaded: true });
      }
    },
    addCustomSymbolAndPersist: async (symbol: string) => {
      const previous = get().customSymbols;
      const next = [...previous, symbol];

      set({ customSymbols: next });

      try {
        await saveSpecailSymbols(next);
      } catch (error) {
        console.error("Save special symbols failed", error);

        set({ customSymbols: previous });

        throw error;
      }
    },
    removeCustomSymbol: (index: number) => {
      // 乐观更新：先更新内存状态，再异步持久化；若持久化失败则回滚
      const previous = get().customSymbols;

      if (index < 0 || index >= previous.length) {
        return;
      }

      const next = [...previous];

      next.splice(index, 1);

      set({ customSymbols: next });

      // 异步保存，失败时回滚到 previous （不抛出以免打断调用方）
      saveSpecailSymbols(next).catch((error) => {
        console.error("Save special symbols failed", error);

        set({ customSymbols: previous });
      });
    },
    reorderCustomSymbols: (fromIndex: number, toIndex: number) => {
      // 乐观更新 + 异步持久化，同样在失败时回滚
      const previous = get().customSymbols;

      const length = previous.length;

      if (
        fromIndex < 0 ||
        fromIndex >= length ||
        toIndex < 0 ||
        toIndex >= length
      ) {
        return;
      }

      const next = [...previous];
      const [moved] = next.splice(fromIndex, 1);

      next.splice(toIndex, 0, moved);

      set({ customSymbols: next });

      saveSpecailSymbols(next).catch((error) => {
        console.error("Save special symbols failed", error);

        set({ customSymbols: previous });
      });
    },
  })
);
