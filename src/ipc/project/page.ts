import { invoke } from "@tauri-apps/api/core";
import type { Page, Unit } from "../../models/project";

type RawPage = {
  id: string;
  local_image_path?: string | null;
};

type OutPage = {
  id: string;
  local_image_path: string;
};

function toRawPage(page: Page): OutPage {
  return {
    id: page.id,
    local_image_path: page.localImageUrl ?? page.remoteImageUrl ?? "",
  };
}

function fromRawPage(p: RawPage): Page {
  return {
    id: p.id,
    localImageUrl: p.local_image_path ?? undefined,
    remoteImageUrl: undefined,
  };
}

export async function getProjectPages(projectId: string): Promise<Page[]> {
  try {
    const rawPages = await invoke<RawPage[]>("get_project_pages", {
      projectId: projectId,
    });

    return (rawPages || []).map(fromRawPage);
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}

export async function createProjectPages(
  projectId: string,
  pages: Page[],
  unitsMap?: Map<string, Unit[]>
): Promise<void> {
  try {
    const rawPages = (pages || []).map((p) => toRawPage(p));

    await invoke<void>("create_project_pages", {
      projectId: projectId,
      pages: rawPages,
    });

    if (unitsMap) {
      for (const page of pages) {
        const units = unitsMap.get(page.id);

        if (units && units.length > 0) {
          const rawUnits = units.map((u) => ({
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
            pageId: page.id,
            units: rawUnits,
          });
        }
      }
    }

    return;
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}

export async function updateProjectPages(
  projectId: string,
  pages: Page[]
): Promise<void> {
  try {
    const rawPages = (pages || []).map((p) => toRawPage(p));

    await invoke<void>("update_project_pages", {
      projectId: projectId,
      pages: rawPages,
    });

    return;
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}

export async function deleteProjectPages(pageIds: string[]): Promise<void> {
  try {
    await invoke<void>("delete_project_pages", { pageIds: pageIds });

    return;
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}

export default {
  getProjectPages,
  createProjectPages,
  updateProjectPages,
  deleteProjectPages,
};
