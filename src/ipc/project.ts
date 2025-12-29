import { invoke } from "@tauri-apps/api/core";
import type { Project, Page, Unit } from "../models/project";

// 后端 DTO 定义（snake_case）
type BackendUnit = {
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

type BackendPage = {
  id: string;
  local_image_path?: string | null;
  units?: BackendUnit[];
};

// 将前端 Page -> 后端 LocalPage DTO（字段映射）
function toBackendPage(page: Page): BackendPage {
  return {
    id: page.id,
    local_image_path: page.localImageUrl ?? page.remoteImageUrl ?? undefined,
    units: (page.units || []).map((u) => ({
      id: u.id,
      x: u.x,
      y: u.y,
      index_in_page: u.indexInPage,
      is_inbox: u.isInbox,
      translated_text: u.translatedText ?? null,
      is_prooved: u.isProoved,
      prooved_text: u.proovedText ?? null,
      comment: u.comment ?? null,
    })),
  };
}

// 将后端 LocalPage -> 前端 Page DTO
function fromBackendPage(p: BackendPage): Page {
  return {
    id: p.id,
    localImageUrl: p.local_image_path ?? undefined,
    remoteImageUrl: undefined,
    units: (p.units || []).map(fromBackendUnit),
  };
}

// 将后端 LocalUnit -> 前端 Unit DTO
function fromBackendUnit(u: BackendUnit): Unit {
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

// 获取项目列表
export async function getProjects(offset = 0, limit = 10): Promise<Project[]> {
  try {
    const list = await invoke<Project[]>("get_projects", { offset, limit });

    return list;
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}

// 创建本地项目
export async function createProject(project: Project): Promise<void> {
  try {
    // 将前端字段直接传递给后端 create_project（后端 model 使用 snake_case）
    await invoke<void>("create_project", { project });

    return;
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}

// 更新项目
export async function updateProject(project: Project): Promise<void> {
  try {
    await invoke<void>("update_project", { project });

    return;
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}

// 获取某项目的页面列表（含单元）
export async function getProjectPages(projectId: string): Promise<Page[]> {
  try {
    const pages = await invoke<any[]>("get_project_pages", {
      project_id: projectId,
    });

    return (pages || []).map(fromBackendPage);
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}

// 创建项目页面（同时创建页面内单元）
export async function createProjectPage(
  projectId: string,
  indexInProject: number,
  page: Page
): Promise<void> {
  try {
    const payload = {
      project_id: projectId,
      index_in_project: indexInProject,
      page: toBackendPage(page),
    };

    await invoke<void>("create_project_page", payload);

    return;
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}

// 更新项目页面（以及页面内单元）
export async function updateProjectPage(
  projectId: string,
  indexInProject: number,
  page: Page
): Promise<void> {
  try {
    const payload = {
      project_id: projectId,
      index_in_project: indexInProject,
      page: toBackendPage(page),
    };

    await invoke<void>("update_project_page", payload);

    return;
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}

// 删除页面
export async function deleteProjectPage(pageId: string): Promise<void> {
  try {
    await invoke<void>("delete_project_page", { page_id: pageId });

    return;
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}

// 获取页面单元列表
export async function getPageUnits(pageId: string): Promise<Unit[]> {
  try {
    const units = await invoke<any[]>("get_page_units", { page_id: pageId });

    return (units || []).map(fromBackendUnit);
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}

// 创建页面单元
export async function createPageUnit(
  pageId: string,
  unit: Unit
): Promise<void> {
  try {
    const payload = {
      page_id: pageId,
      unit: {
        id: unit.id,
        x: unit.x,
        y: unit.y,
        index_in_page: unit.indexInPage,
        is_inbox: unit.isInbox,
        translated_text: unit.translatedText ?? null,
        is_prooved: unit.isProoved,
        prooved_text: unit.proovedText ?? null,
        comment: unit.comment ?? null,
      },
    };

    await invoke<void>("create_page_unit", payload);

    return;
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}

// 更新页面单元
export async function updatePageUnit(
  pageId: string,
  unit: Unit
): Promise<void> {
  try {
    const payload = {
      page_id: pageId,
      unit: {
        id: unit.id,
        x: unit.x,
        y: unit.y,
        index_in_page: unit.indexInPage,
        is_inbox: unit.isInbox,
        translated_text: unit.translatedText ?? null,
        is_prooved: unit.isProoved,
        prooved_text: unit.proovedText ?? null,
        comment: unit.comment ?? null,
      },
    };

    await invoke<void>("update_page_unit", payload);

    return;
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}

// 删除页面单元
export async function deletePageUnit(unitId: string): Promise<void> {
  try {
    await invoke<void>("delete_page_unit", { unit_id: unitId });

    return;
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}

// 打开文件/目录选择对话框以选择项目目录
export async function selectProjectDir(): Promise<string | undefined> {
  try {
    const path = await invoke<string | null | undefined>("select_project_dir");

    return path ?? undefined;
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}

export default {
  getProjects,
  createProject,
  updateProject,
  getProjectPages,
  createProjectPage,
  updateProjectPage,
  deleteProjectPage,
  getPageUnits,
  createPageUnit,
  updatePageUnit,
  deletePageUnit,
  selectProjectDir,
};
