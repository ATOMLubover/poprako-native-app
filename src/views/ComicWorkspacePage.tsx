import { useEffect, useState } from "react";
import ProjectList from "../components/project/ProjectList";
import LocalProjectCreator from "../components/project/LocalProjectCreator";
import LocalProjectImporter from "../components/project/LocalProjectImporter";
import { LocalTranslator } from "../components/project/LocalTranslator";
import { createPortal } from "react-dom";
import NatureButton from "../components/NatureButton";
import Icon from "../components/Icon";
import type { Project } from "../models/project";
import {
  getProjects,
  getActiveProjectId,
  setActiveProject,
  clearActiveProject,
} from "../store/project";
import "./ComicWorkspacePage.css";

export default function ComicWorkspacePage() {
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [showCreator, setShowCreator] = useState<boolean>(false);
  const [showImporter, setShowImporter] = useState<boolean>(false);
  // Restore in-memory active project ID on mount (no persistence involved)
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(
    () => getActiveProjectId(),
  );

  useEffect(() => {
    let mounted = true;

    setLoading(true);

    getProjects()
      .then((ps) => {
        if (!mounted) return;

        setAllProjects(ps || []);
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;

        setError((err as Error).message || String(err));
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredProjects =
    searchKeyword.trim() === ""
      ? allProjects
      : allProjects.filter((p) => {
          const keyword = searchKeyword.toLowerCase();
          const titleMatch = p.title?.toLowerCase().includes(keyword);
          const authorMatch = p.author?.toLowerCase().includes(keyword);
          return titleMatch || authorMatch;
        });

  const handleCreateLocal = () => {
    setShowCreator(true);
  };

  // 导入本地或外部项目
  const handleImportProject = () => {
    setShowImporter(true);
  };

  const handleSyncCloud = () => {
    console.log("同步云端项目");
  };

  const handleActProject = (project: Project) => {
    // 仅支持本地项目
    if (project.relatedRemoteComicId) {
      console.log("云端项目暂不支持");
      return;
    }

    setActiveProject(project.id);
    setActiveProjectIdState(project.id);
  };

  const handleSyncProject = (project: Project) => {
    console.log("同步项目:", project);
  };

  // 刷新项目列表（供子组件回调使用）
  async function handleRefreshProjects() {
    try {
      const ps = await getProjects(true);
      setAllProjects(ps || []);
    } catch (e) {
      setError((e as Error).message || String(e));
    }
  }

  const handleExitTranslator = () => {
    clearActiveProject();
    setActiveProjectIdState(null);
  };

  const handleProjectChange = (updatedProject: Project) => {
    // 更新 allProjects 中的对应项目
    setAllProjects((prev) =>
      prev.map((p) => (p.id === updatedProject.id ? updatedProject : p)),
    );
  };

  // 如果有激活的项目，则渲染 LocalTranslator
  const activeProject = activeProjectId
    ? allProjects.find((p) => p.id === activeProjectId)
    : null;

  if (activeProject) {
    return (
      <LocalTranslator
        project={activeProject}
        onExit={handleExitTranslator}
        onProjectChange={handleProjectChange}
      />
    );
  }

  return (
    <div className="twp-root twp-fade-in">
      {/* 第一行：标题 */}
      <div className="twp-header">
        <h1 className="twp-title">翻校工作区</h1>
      </div>

      {/* 背景装饰图标（右下角） */}
      <div aria-hidden className="twp-bg-icon">
        <Icon name="proofread" size={280} />
      </div>

      {/* 第二行：搜索框 + 按钮栏 */}
      <div className="twp-toolbar">
        <input
          type="text"
          className="twp-search-input"
          placeholder="搜索项目名称或作者..."
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
        />

        <NatureButton variant="mist" minWidth={120} onClick={handleCreateLocal}>
          新建项目
        </NatureButton>

        <NatureButton
          variant="mist"
          minWidth={120}
          onClick={handleImportProject}
        >
          导入项目
        </NatureButton>

        {/*         <NatureButton
          variant="cloud"
          minWidth={120}
          onClick={handleSyncCloud}
        >
          云端项目同步
        </NatureButton> */}
      </div>

      {/* 第三行：项目列表容器 */}
      <div className="twp-list-container">
        {loading && <div className="twp-loading">加载中…</div>}

        {error && <div className="twp-error">加载项目失败：{error}</div>}

        {!loading && !error && (
          <ProjectList
            projects={filteredProjects}
            onAct={handleActProject}
            onSync={handleSyncProject}
            onRefresh={handleRefreshProjects}
          />
        )}
      </div>

      {showCreator
        ? createPortal(
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(6, 10, 8, 0.45)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 160,
              }}
              onClick={() => setShowCreator(false)}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: "92%", maxHeight: "86%" }}
              >
                <LocalProjectCreator
                  onSave={async () => {
                    try {
                      const ps = await getProjects(true);
                      setAllProjects(ps || []);
                    } catch (e) {
                      setError((e as Error).message || String(e));
                    } finally {
                      setShowCreator(false);
                    }
                  }}
                  onCancel={() => setShowCreator(false)}
                />
              </div>
            </div>,
            document.body,
          )
        : null}

      {showImporter
        ? createPortal(
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(6, 10, 8, 0.45)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 160,
              }}
              onClick={() => setShowImporter(false)}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{ maxWidth: "92%", maxHeight: "86%" }}
              >
                <LocalProjectImporter
                  onSuccess={async () => {
                    try {
                      const ps = await getProjects(true);
                      setAllProjects(ps || []);
                    } catch (e) {
                      setError((e as Error).message || String(e));
                    } finally {
                      setShowImporter(false);
                    }
                  }}
                  onCancel={() => setShowImporter(false)}
                />
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
