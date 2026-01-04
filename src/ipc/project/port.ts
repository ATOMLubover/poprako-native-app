import { invoke } from "@tauri-apps/api/core";

export type SelectedProjectDir = { dir_path: string; image_count: number };

export async function selectProjectDir(): Promise<SelectedProjectDir> {
  try {
    const res = await invoke<SelectedProjectDir>("select_project_dir");

    if (
      !res ||
      typeof res !== "object" ||
      typeof (res as any).dir_path !== "string"
    ) {
      throw new Error("未选择任何目录");
    }

    return res;
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}

export async function selectProjectArchive(): Promise<string> {
  try {
    return await invoke<string>("select_project_archive");
  } catch (e) {
    throw new Error((e as Error).message || String(e));
  }
}

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
  selectProjectDir,
  selectProjectArchive,
  importProject,
  exportProject,
};
