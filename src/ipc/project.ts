import { invoke } from "@tauri-apps/api/core";
import type { Project, Page, Unit } from "../models/project";

// 非导出的原始后端 DTO（snake_case），用于接收 Rust 返回的 JSON
type RawUnit = {
  id: string;
  x_coordinate: number;
  y_coordinate: number;
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
  units?: RawUnit[];
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

// 将前端 Page -> 后端 RawPage DTO（字段映射）
function toRawPage(page: Page): RawPage {
  return {
    id: page.id,
    local_image_path: page.localImageUrl ?? page.remoteImageUrl ?? undefined,
    units: (page.units || []).map((u) => ({
      id: u.id,
      x_coordinate: u.x,
      y_coordinate: u.y,
      index_in_page: u.indexInPage,
      is_inbox: u.isInbox,
      translated_text: u.translatedText ?? null,
      is_prooved: u.isProoved,
      prooved_text: u.proovedText ?? null,
      comment: u.comment ?? null,
    })),
  };
}

// 将后端 RawPage -> 前端 Page DTO
function fromRawPage(p: RawPage): Page {
  return {
    id: p.id,
    localImageUrl: p.local_image_path ?? undefined,
    remoteImageUrl: undefined,
    units: (p.units || []).map(fromRawUnit),
  };
}

// 将后端 RawUnit -> 前端 Unit DTO
function fromRawUnit(u: RawUnit): Unit {
  return {
    id: u.id,
    x: u.x_coordinate,
    y: u.y_coordinate,
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
export async function getProjectPages(projectId: string): Promise<Page[]> {
  try {
    const pages = await invoke<RawPage[]>("get_project_pages", {
      projectId: projectId,
    });

    return (pages || []).map(fromRawPage);
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}

// 创建项目页面（同时创建页面内单元）
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

    return;
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}

// 更新项目页面（以及页面内单元）
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

// 创建页面单元
export async function createPageUnits(
  pageId: string,
  units: Unit[]
): Promise<void> {
  try {
    const rawUnits = (units || []).map((u) => ({
      id: u.id,
      x_coordinate: u.x,
      y_coordinate: u.y,
      index_in_page: u.indexInPage,
      is_inbox: u.isInbox,
      translated_text: u.translatedText ?? null,
      is_prooved: u.isProoved,
      prooved_text: u.proovedText ?? null,
      comment: u.comment ?? null,
    }));

    await invoke<void>("create_page_units", {
      pageId: pageId,
      units: rawUnits,
    });

    return;
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}

// 更新页面单元
export async function updatePageUnits(
  pageId: string,
  units: Unit[]
): Promise<void> {
  try {
    const rawUnits = (units || []).map((u) => ({
      id: u.id,
      x_coordinate: u.x,
      y_coordinate: u.y,
      index_in_page: u.indexInPage,
      is_inbox: u.isInbox,
      translated_text: u.translatedText ?? null,
      is_prooved: u.isProoved,
      prooved_text: u.proovedText ?? null,
      comment: u.comment ?? null,
    }));

    await invoke<void>("update_page_units", {
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

// 打开文件/目录选择对话框以选择项目目录
export async function selectProjectDir(): Promise<string[]> {
  try {
    const res = await invoke<string[]>("select_project_dir");

    return res || [];
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}

// 打开对话框以选择 Poprako 项目存档（zip 文件）或文件夹，返回所选路径（可能为 undefined）
export async function selectPoprakoArchivedPath(): Promise<string | undefined> {
  try {
    const path = await invoke<string | null | undefined>(
      "select_poprako_archived_path"
    );

    return path ?? undefined;
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}

// 导入 Poprako 项目（支持 zip 或 文件夹）
export async function importPoprakoProject(projectPath: string): Promise<void> {
  try {
    await invoke<void>("import_poprako_project", { projectPath: projectPath });

    return;
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
  updateProjectPages,
  deleteProjectPages,
  getPageUnits,
  createPageUnits,
  updatePageUnits,
  deletePageUnits,
  selectProjectDir,
  selectPoprakoArchivedPath,
  importPoprakoProject,
};
