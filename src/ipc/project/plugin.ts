import { invoke } from "@tauri-apps/api/core";
import type { PostProcessor } from "../../models/project";

// Raw DTOs match serde_json representation produced by the backend
type RawCharConverter = {
  mapping: Record<string, string>; // keys are single-character strings
};

type RawNamedCharConverter = {
  name: string;
  processor: RawCharConverter;
};

// Serde external-tagged enum: { "CharConverter": { name, processor } }
type RawPostProcessor = { CharConverter: RawNamedCharConverter };

function rawToModel(r: RawPostProcessor): PostProcessor {
  if ((r as any).CharConverter) {
    const inner = r.CharConverter;
    return {
      kind: "CharConverter",
      name: inner.name,
      processor: { mapping: inner.processor.mapping },
    };
  }

  throw new Error("Unknown post processor variant");
}

function modelToRaw(m: PostProcessor): RawPostProcessor {
  if (m.kind === "CharConverter") {
    return {
      CharConverter: {
        name: m.name,
        processor: { mapping: m.processor.mapping },
      },
    };
  }

  throw new Error("Unknown post processor kind");
}

export async function getLocalPostProcessors(): Promise<PostProcessor[]> {
  try {
    const raws = await invoke<RawPostProcessor[]>("get_local_post_processors");

    if (!Array.isArray(raws)) {
      return [];
    }

    return raws.map(rawToModel);
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}

export async function saveLocalPostProcessor(
  processor: PostProcessor
): Promise<void> {
  try {
    const raw = modelToRaw(processor);

    await invoke<void>("save_local_post_processor", { processor: raw });

    return;
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}

export async function selectPostProcessorFile(): Promise<string> {
  try {
    const path = await invoke<string>("select_post_processor_file");

    return path;
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}

export async function importPostProcessor(path: string): Promise<void> {
  try {
    await invoke<void>("import_post_processor", { path });

    return;
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}

export async function openPostProcessorDir(): Promise<void> {
  try {
    await invoke<void>("open_post_processor_dir");

    return;
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}

export default {
  getLocalPostProcessors,
  saveLocalPostProcessor,
  selectPostProcessorFile,
  importPostProcessor,
  openPostProcessorDir,
};
