import {
  getProjects as ipcGetProjects,
  createProject as ipcCreateProject,
  updateProject as ipcUpdateProject,
  getProjectPages as ipcGetProjectPages,
  createProjectPages as ipcCreateProjectPages,
  deleteProjectPages as ipcDeleteProjectPages,
  getPageUnits as ipcGetPageUnits,
  savePageUnits as ipcSavePageUnits,
  deletePageUnits as ipcDeletePageUnits,
} from "../ipc/project";
import type { Project, Page, Unit, NewLocalProject } from "../models/project";

// 项目列表内存缓存
let cachedProjects: Project[] | null = null;
// 正在进行的获取请求（用于防止并发重复调用后端）
let pendingGetProjects: Promise<Project[]> | null = null;

// 获取项目列表（带缓存）
export async function getProjects(refresh = false): Promise<Project[]> {
  if (!refresh) {
    if (cachedProjects !== null) {
      return cachedProjects;
    }

    if (pendingGetProjects !== null) {
      return pendingGetProjects;
    }
  }

  // 发起请求并保存进行中的 Promise，防止并发重复调用
  pendingGetProjects = (async () => {
    try {
      const projects = await ipcGetProjects();

      cachedProjects = projects;

      return projects;
    } finally {
      // 无论成功或失败，都清理 pending 以便后续重试
      pendingGetProjects = null;
    }
  })();

  return pendingGetProjects;
}

// 创建本地项目（成功后自动刷新列表）
export async function createLocalProject(
  project: NewLocalProject
): Promise<void> {
  const fullProject: Project = {
    id: crypto.randomUUID(),
    author: project.author,
    title: project.title,
    localImageDir: project.localImageDir,
    unitCount: 0,
    translatedUnitCount: 0,
    proovedUnitCount: 0,
    pageCount: 0,
    updatedAt: new Date().toISOString(),
  };

  await ipcCreateProject(fullProject);
  await getProjects(true);
}

// 更新项目
export async function updateProject(project: Project): Promise<void> {
  await ipcUpdateProject(project);
  await getProjects(true);
}

// 删除项目（需要先删除所有页面，成功后自动刷新列表）
export async function deleteProject(projectId: string): Promise<void> {
  const pages = await ipcGetProjectPages(projectId);
  const pageIds = pages.map((p) => p.id);

  if (pageIds.length > 0) {
    await ipcDeleteProjectPages(pageIds);
  }

  await getProjects(true);
}

// 获取项目的页面列表
export async function getProjectPages(projectId: string): Promise<Page[]> {
  return await ipcGetProjectPages(projectId);
}

// 创建项目页面
export async function createProjectPages(
  projectId: string,
  pages: Page[]
): Promise<void> {
  await ipcCreateProjectPages(projectId, pages);
}

// `updateProjectPages` removed — use `savePageUnits`/`createProjectPages` as appropriate

// 删除项目页面
export async function deleteProjectPages(pageIds: string[]): Promise<void> {
  await ipcDeleteProjectPages(pageIds);
}

// 获取页面单元列表
export async function getPageUnits(pageId: string): Promise<Unit[]> {
  return await ipcGetPageUnits(pageId);
}

// 保存页面单元（upsert）
export async function savePageUnits(
  pageId: string,
  units: Unit[]
): Promise<void> {
  await ipcSavePageUnits(pageId, units);
}

// 删除页面单元
export async function deletePageUnits(unitIds: string[]): Promise<void> {
  await ipcDeletePageUnits(unitIds);
}

// 清除项目列表缓存
export function clearProjectCache(): void {
  cachedProjects = null;
}

// 当前激活的项目 ID（用于翻校工作区）
let activeProjectId: string | null = null;
// 当前激活项目的页面索引（仅内存级别，随进程重启清空）
let activeProjectPageIndex: number | null = null;

// 设置激活项目
export function setActiveProject(projectId: string): void {
  activeProjectId = projectId;
}

// 设置当前激活项目的页面索引（仅在运行时保留）
export function setActiveProjectPageIndex(index: number): void {
  activeProjectPageIndex = index;
}

// 获取当前激活项目的页面索引
export function getActiveProjectPageIndex(): number | null {
  return activeProjectPageIndex;
}

// 获取激活项目 ID
export function getActiveProjectId(): string | null {
  // 优先返回内存中的值
  if (activeProjectId !== null) {
    return activeProjectId;
  }
  return null;
}

// 清除激活项目
export function clearActiveProject(): void {
  activeProjectId = null;
}
