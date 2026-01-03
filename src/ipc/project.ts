import { invoke } from "@tauri-apps/api/core";
import type { Project, Page, Unit } from "../models/project";

// 非导出的原始后端 DTO（snake_case），用于接收 Rust 返回的 JSON
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

type RawPage = {
  id: string;
  local_image_path?: string | null;
};

// Outgoing DTO for create/update project pages: matches Rust `model_project::LocalPage`
type OutPage = {
  id: string;
  local_image_path: string;
};

type RawProject = {
  id: string;
  author: string;
  title: string;
  local_image_dir?: string | null;
  related_comic_id?: string | null;
  unit_count: number;
  translated_unit_count: number;
  prooved_unit_count: number;
  inbox_unit_count?: number | null;
  outbox_unit_count?: number | null;
  page_count: number;
  updated_at?: string | null;
};

// 将前端 Page -> 后端 OutPage DTO（字段映射，不含 units）
function toRawPage(page: Page): OutPage {
  return {
    id: page.id,
    local_image_path: page.localImageUrl ?? page.remoteImageUrl ?? "",
  };
}

// 将后端 RawPage -> 前端 Page DTO（不含 units，由前端自行组装）
function fromRawPage(p: RawPage): Page {
  return {
    id: p.id,
    localImageUrl: p.local_image_path ?? undefined,
    remoteImageUrl: undefined,
    units: [],
  };
}

// 将后端 RawUnit -> 前端 Unit DTO
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

// RawProject <-> frontend Project 转换
function fromRawProject(r: RawProject): Project {
  return {
    id: r.id,
    author: r.author,
    title: r.title,
    localImageDir: r.local_image_dir ?? undefined,
    relatedRemoteComicId: r.related_comic_id ?? undefined,
    unitCount: r.unit_count,
    translatedUnitCount: r.translated_unit_count,
    proovedUnitCount: r.prooved_unit_count,
    inboxUnitCount: r.inbox_unit_count ?? undefined,
    outboxUnitCount: r.outbox_unit_count ?? undefined,
    pageCount: r.page_count,
    updatedAt: r.updated_at ?? undefined,
  };
}

function toRawProject(p: Project): RawProject {
  return {
    id: p.id,
    author: p.author,
    title: p.title,
    local_image_dir: p.localImageDir ?? null,
    related_comic_id: p.relatedRemoteComicId ?? null,
    unit_count: p.unitCount,
    translated_unit_count: p.translatedUnitCount,
    prooved_unit_count: p.proovedUnitCount,
    inbox_unit_count: p.inboxUnitCount ?? null,
    outbox_unit_count: p.outboxUnitCount ?? null,
    page_count: p.pageCount,
    // Ensure backend receives a valid updated_at. Use provided value or current time.
    updated_at: p.updatedAt ?? new Date().toISOString(),
  };
}

// 获取项目列表
export async function getProjects(): Promise<Project[]> {
  try {
    const raws = await invoke<RawProject[]>("get_projects");

    if (!Array.isArray(raws) || raws.length === 0) {
      return [];
    }

    return raws.map(fromRawProject);
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}

// 创建本地项目
export async function createProject(project: Project): Promise<void> {
  try {
    // 将前端字段转换为后端 snake_case 的 RawProject 并调用后端 create_local_project
    const raw = toRawProject(project);

    await invoke<void>("create_local_project", { project: raw });

    return;
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}

// 更新项目
export async function updateProject(project: Project): Promise<void> {
  try {
    const raw = toRawProject(project);

    await invoke<void>("update_project", { project: raw });

    return;
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}

// 获取某项目的页面列表（含单元）
// 前端自行调用 page IPC 和 unit IPC 并组装
export async function getProjectPages(projectId: string): Promise<Page[]> {
  try {
    const rawPages = await invoke<RawPage[]>("get_project_pages", {
      projectId: projectId,
    });

    const pages = (rawPages || []).map(fromRawPage);

    // 为每个 page 获取其 units
    for (const page of pages) {
      try {
        const rawUnits = await invoke<RawUnit[]>("get_page_units", {
          pageId: page.id,
        });

        page.units = (rawUnits || []).map(fromRawUnit);
      } catch (err) {
        console.error(`Failed to get units for page ${page.id}`, err);
        page.units = [];
      }
    }

    return pages;
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}

// 创建项目页面（page 和 unit 分别创建）
export async function createProjectPages(
  projectId: string,
  pages: Page[]
): Promise<void> {
  try {
    const rawPages = (pages || []).map((p) => toRawPage(p));

    await invoke<void>("create_project_pages", {
      projectId: projectId,
      pages: rawPages,
    });

    // 分别创建每个 page 的 units
    for (const page of pages) {
      if (page.units && page.units.length > 0) {
        const rawUnits = page.units.map((u) => ({
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

    return;
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}

// Note: `updateProjectPages` removed — page metadata is immutable in translation flow.

// 删除页面
export async function deleteProjectPages(pageIds: string[]): Promise<void> {
  try {
    await invoke<void>("delete_project_pages", { pageIds: pageIds });

    return;
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}

// 获取页面单元列表
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

// 保存页面单元（upsert）
export async function savePageUnits(
  pageId: string,
  units: Unit[]
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

// 删除页面单元
export async function deletePageUnits(unitIds: string[]): Promise<void> {
  try {
    await invoke<void>("delete_page_units", { unitIds: unitIds });

    return;
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}

// 删除项目
export async function deleteProject(projectId: string): Promise<void> {
  try {
    await invoke<void>("delete_project", { projectId: projectId });

    return;
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}

// 打开文件/目录选择对话框以选择项目目录
export async function selectNewProjectDir(): Promise<string[]> {
  try {
    const res = await invoke<string[]>("select_new_project_dir");

    return res || [];
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}

// 选择归档项目路径（后端已重命名）
export async function selectArchivedProjectPath(): Promise<string> {
  try {
    return await invoke<string>("select_archived_project_path");
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}

// 导入 Poprako 项目（支持 zip 或 json 或 txt）
export async function importProject(
  projectPath: string,
  author?: string,
  title?: string
): Promise<void> {
  try {
    const args: Record<string, unknown> = { projectPath: projectPath };

    if (typeof author === "string" && author.trim() !== "") {
      args.author = author;
    }

    if (typeof title === "string" && title.trim() !== "") {
      args.title = title;
    }

    await invoke<void>("import_project", args);

    return;
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}

// 导出 Poprako 项目（返回生成的归档文件夹）
export async function exportProject(projectId: string): Promise<string> {
  try {
    const path = await invoke<string>("export_project", {
      projectId: projectId,
    });

    return path;
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}

export default {
  getProjects,
  createProject,
  updateProject,
  getProjectPages,
  createProjectPages,
  deleteProjectPages,
  getPageUnits,
  savePageUnits,
  deletePageUnits,
  deleteProject,
  select_new_project_dir: selectNewProjectDir,
  select_archived_project_path: selectArchivedProjectPath,
  import_project: importProject,
  export_project: exportProject,
};
