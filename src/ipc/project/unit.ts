import { invoke } from "@tauri-apps/api/core";
import type { Unit } from "../../models/project";

type RawUnit = {
  id: string;
  x: number;
  y: number;
  index_in_page: number;
  is_inbox: boolean;
  translated_text?: string | null;
  is_prooved: boolean;
  prooved_text?: string | null;
  comment?: string | null;
};

function fromRawUnit(u: RawUnit): Unit {
  return {
    id: u.id,
    x: u.x,
    y: u.y,
    indexInPage: u.index_in_page,
    isInbox: u.is_inbox,
    translatedText: u.translated_text ?? undefined,
    isProoved: u.is_prooved,
    proovedText: u.prooved_text ?? undefined,
    comment: u.comment ?? undefined,
  };
}

export async function getPageUnits(pageId: string): Promise<Unit[]> {
  try {
    const units = await invoke<RawUnit[]>("get_page_units", {
      pageId: pageId,
    });

    return (units || []).map(fromRawUnit);
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}

export async function savePageUnits(
  pageId: string,
  units: Unit[],
): Promise<void> {
  try {
    const rawUnits = (units || []).map((u) => ({
      id: u.id,
      x: u.x,
      y: u.y,
      index_in_page: u.indexInPage,
      is_inbox: u.isInbox,
      translated_text: u.translatedText ?? null,
      is_prooved: u.isProoved,
      prooved_text: u.proovedText ?? null,
      comment: u.comment ?? null,
    }));

    await invoke<void>("save_page_units", {
      pageId: pageId,
      units: rawUnits,
    });

    return;
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}

export async function deletePageUnits(unitIds: string[]): Promise<void> {
  try {
    await invoke<void>("delete_page_units", { unitIds: unitIds });

    return;
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}

export async function searchComicText(
  projectId: string,
  query: string,
): Promise<string[]> {
  try {
    return await invoke<string[]>("search_comic_text", { projectId, query });
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}

export async function replaceComicText(
  projectId: string,
  pageIds: string[],
  original: string,
  replacement: string,
): Promise<void> {
  try {
    await invoke<void>("replace_comic_text", {
      projectId,
      pageIds,
      original,
      replacement,
    });
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}

export default {
  getPageUnits,
  savePageUnits,
  deletePageUnits,
  searchComicText,
  replaceComicText,
};
