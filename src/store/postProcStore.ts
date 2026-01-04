import { create } from "zustand";
import * as Plugin from "../ipc/project/plugin";
import type { PostProcessor } from "../models/project";

type PostProcState = {
  postProcessors: PostProcessor[];
  isLoading: boolean;
  isLoaded: boolean;
  loadError: string | null;
  loadPostProcessorsIfNeeded: () => Promise<void>;
  savePostProcessor: (p: PostProcessor) => Promise<void>;
  selectPostProcessorFile: () => Promise<string>;
  importPostProcessor: (path: string) => Promise<void>;
  openPostProcessorDir: () => Promise<void>;
};

export const usePostProcStore = create<PostProcState>((set, get) => ({
  postProcessors: [],
  isLoading: false,
  isLoaded: false,
  loadError: null,
  loadPostProcessorsIfNeeded: async () => {
    if (get().isLoaded || get().isLoading) {
      return;
    }

    set({ isLoading: true, loadError: null });

    try {
      const procs = await Plugin.getLocalPostProcessors();

      set({ postProcessors: procs || [] });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);

      console.error("Load post processors failed", message);

      set({ postProcessors: [], loadError: message });
    } finally {
      set({ isLoading: false, isLoaded: true });
    }
  },
  savePostProcessor: async (p: PostProcessor) => {
    const previous = get().postProcessors;

    // optimistic update: try to replace by name if available, otherwise append
    const name = (p && (p.name ?? (p.named && p.named.name))) as
      | string
      | undefined;

    let next: PostProcessor[];

    if (name) {
      const idx = previous.findIndex(
        (x: any) => (x && (x.name ?? (x.named && x.named.name))) === name
      );

      if (idx >= 0) {
        next = [...previous];
        next[idx] = p;
      } else {
        next = [...previous, p];
      }
    } else {
      next = [...previous, p];
    }

    set({ postProcessors: next });

    try {
      await Plugin.saveLocalPostProcessor(p);
    } catch (err) {
      console.error("Save post processor failed", err);

      // rollback on failure
      set({ postProcessors: previous });

      throw err;
    }
  },
  selectPostProcessorFile: async () => {
    try {
      return await Plugin.selectPostProcessorFile();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("Select post processor file failed", message);
      throw err;
    }
  },
  importPostProcessor: async (path: string) => {
    try {
      await Plugin.importPostProcessor(path);
      // after import, reload the list to include new processor
      // mark as not loaded so next call will refresh
      set({ isLoaded: false });
      await get().loadPostProcessorsIfNeeded();
    } catch (err) {
      console.error("Import post processor failed", err);
      throw err;
    }
  },
  openPostProcessorDir: async () => {
    try {
      await Plugin.openPostProcessorDir();
    } catch (err) {
      console.error("Open post processor dir failed", err);
      throw err;
    }
  },
}));

export default usePostProcStore;
