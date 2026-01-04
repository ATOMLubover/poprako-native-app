pub mod page;
pub mod port;
pub mod unit;

use crate::{
    ipc::get_ipc_request_id,
    model::project::{NewLocalProject, Project, SelectedProjectDir},
    result_trace::ResultTrace,
    service,
};

#[tauri::command]
#[tracing::instrument]
pub async fn get_projects() -> Result<Vec<Project>, String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.get_projects.start");

    let result = service::project::get_projects()
        .await
        .trace_error("获取项目列表失败")
        .map_err(|e| e.to_string())?;

    tracing::info!(ipc_id = ipc_id, "ipc.project.get_projects.success");

    Ok(result)
}

#[tauri::command]
#[tracing::instrument]
pub async fn create_local_project(project: NewLocalProject) -> Result<(), String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.create_local_project.start");

    service::project::create_local_project(project)
        .await
        .trace_error("创建本地项目失败")
        .map_err(|e| e.to_string())?;

    tracing::info!(ipc_id = ipc_id, "ipc.project.create_local_project.success");

    Ok(())
}

#[tauri::command]
#[tracing::instrument]
pub async fn update_project(project: Project) -> Result<(), String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.update_project.start");
    service::project::update_local_project(project)
        .await
        .trace_error("更新本地项目条目时失败")
        .map_err(|e| e.to_string())?;

    tracing::info!(ipc_id = ipc_id, "ipc.project.update_project.success");

    Ok(())
}

#[tauri::command]
#[tracing::instrument]
pub async fn delete_project(project_id: String) -> Result<(), String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.delete_project.start");
    service::project::delete_project(&project_id)
        .await
        .trace_error("删除本地项目时失败")
        .map_err(|e| e.to_string())?;

    tracing::info!(ipc_id = ipc_id, "ipc.project.delete_project.success");

    Ok(())
}

#[tauri::command]
#[tracing::instrument]
pub async fn select_project_dir() -> Result<SelectedProjectDir, String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.select_project_dir.start");

    let dir = service::project::select_project_dir()
        .trace_debug("选择项目图片目录失败")
        .map_err(|e| e.to_string())?;

    tracing::info!(
        ipc_id = ipc_id,
        selected = ?dir,
        "ipc.project.select_project_dir.success"
    );

    Ok(dir)
}

#[tauri::command]
#[tracing::instrument]
pub async fn select_project_archive() -> Result<String, String> {
    let ipc_id = get_ipc_request_id();

    tracing::info!(ipc_id = ipc_id, "ipc.project.select_project_archive.start");

    let path = service::project::select_project_file()
        .trace_debug("选择 Poprako 项目文件失败")
        .map_err(|e| e.to_string())?;

    tracing::info!(
        ipc_id = ipc_id,
        selected = ?path,
        "ipc.project.select_project_archive.success"
    );

    Ok(path.to_string_lossy().to_string())
}
