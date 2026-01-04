import { invoke } from "@tauri-apps/api/core";
import type { Project, NewLocalProject } from "../models/project";
import * as Page from "./project/page";
import * as Unit from "./project/unit";
import * as Port from "./project/port";
import * as Plugin from "./project/plugin";

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
    updated_at: p.updatedAt ?? new Date().toISOString(),
  };
}

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

export async function createLocalProject(
  project: NewLocalProject
): Promise<void> {
  try {
    const raw = {
      author: project.author,
      title: project.title,
      local_image_dir: project.localImageDir ?? "",
    };

    await invoke<void>("create_local_project", { project: raw });

    return;
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}

export async function updateProject(project: Project): Promise<void> {
  try {
    const raw = toRawProject(project);

    await invoke<void>("update_project", { project: raw });

    return;
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}
export const getProjectPages = Page.getProjectPages;
export const createProjectPages = Page.createProjectPages;
export const updateProjectPages = Page.updateProjectPages;
export const deleteProjectPages = Page.deleteProjectPages;

export const getPageUnits = Unit.getPageUnits;
export const savePageUnits = Unit.savePageUnits;
export const deletePageUnits = Unit.deletePageUnits;

export const getLocalPostProcessors = Plugin.getLocalPostProcessors;
export const saveLocalPostProcessor = Plugin.saveLocalPostProcessor;
export const selectPostProcessorFile = Plugin.selectPostProcessorFile;
export const importPostProcessor = Plugin.importPostProcessor;
export const openPostProcessorDir = Plugin.openPostProcessorDir;

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
export const selectNewProjectDir = Port.selectProjectDir;
export const selectArchivedProjectPath = Port.selectProjectArchive;

// 导入 Poprako 项目（支持 zip 或 json 或 txt）
export const importProject = Port.importProject;

// 导出 Poprako 项目（返回生成的归档文件夹）
export const exportProject = Port.exportProject;

export default {
  getProjects,
  createProject: createLocalProject,
  updateProject,
  deleteProject,
  // page api
  getProjectPages: Page.getProjectPages,
  createProjectPages: Page.createProjectPages,
  updateProjectPages: Page.updateProjectPages,
  deleteProjectPages: Page.deleteProjectPages,
  // unit api
  getPageUnits: Unit.getPageUnits,
  savePageUnits: Unit.savePageUnits,
  deletePageUnits: Unit.deletePageUnits,
  // port api
  selectNewProjectDir: Port.selectProjectDir,
  selectArchivedProjectPath: Port.selectProjectArchive,
  importProject: Port.importProject,
  exportProject: Port.exportProject,
  // plugin api
  getLocalPostProcessors: Plugin.getLocalPostProcessors,
  saveLocalPostProcessor: Plugin.saveLocalPostProcessor,
  selectPostProcessorFile: Plugin.selectPostProcessorFile,
  importPostProcessor: Plugin.importPostProcessor,
  openPostProcessorDir: Plugin.openPostProcessorDir,
};
