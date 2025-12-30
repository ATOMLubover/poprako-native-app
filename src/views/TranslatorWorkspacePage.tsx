import { useEffect, useState } from "react";
import ProjectList from "../components/project/ProjectList";
import NatureButton from "../components/NatureButton";
import type { Project } from "../models/project";
import { getProjects } from "../store/project";
import "./TranslatorWorkspacePage.css";

export default function TranslatorWorkspacePage() {
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | undefined>(undefined);

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

  const filteredProjects = searchKeyword.trim() === ""
    ? allProjects
    : allProjects.filter((p) => {
        const keyword = searchKeyword.toLowerCase();
        const titleMatch = p.title?.toLowerCase().includes(keyword);
        const authorMatch = p.author?.toLowerCase().includes(keyword);
        return titleMatch || authorMatch;
      });

  const handleCreateLocal = () => {
    console.log("新建本地项目");
  };

  const handleSyncCloud = () => {
    console.log("同步云端项目");
  };

  const handleActProject = (project: Project) => {
    console.log("开始项目:", project);
  };

  const handleSyncProject = (project: Project) => {
    console.log("同步项目:", project);
  };

  return (
    <div className="twp-root">
      {/* 第一行：标题 */}
      <div className="twp-header">
        <h1 className="twp-title">翻校工作区</h1>
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

        <NatureButton
          variant="mist"
          minWidth={120}
          onClick={handleCreateLocal}
        >
          新建本地项目
        </NatureButton>

        <NatureButton
          variant="cloud"
          minWidth={120}
          onClick={handleSyncCloud}
        >
          同步云端项目
        </NatureButton>
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
          />
        )}
      </div>
    </div>
  );
}
