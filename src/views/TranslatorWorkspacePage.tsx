import { useState } from "react";
import ProjectList from "../components/translator/ProjectList";
import NatureButton from "../components/NatureButton";
import type { Project } from "../models/translator";
import "./TranslatorWorkspacePage.css";

export default function TranslatorWorkspacePage() {
  const [searchKeyword, setSearchKeyword] = useState<string>("");
  const [allProjects] = useState<Project[]>(__mockGenerateProjects());

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
        <ProjectList
          projects={filteredProjects}
          onAct={handleActProject}
          onSync={handleSyncProject}
        />
      </div>
    </div>
  );
}

function __mockGenerateProjects(): Project[] {
  return [
    {
      id: "proj-001",
      author: "白杨组",
      title: "本地项目一",
      pageCount: 12,
      unitCount: 240,
      translatedUnitCount: 180,
      proovedUnitCount: 40,
    },
    {
      id: "proj-002",
      author: "远程组",
      title: "云端漫画二",
      pageCount: 8,
      unitCount: 160,
      translatedUnitCount: 120,
      proovedUnitCount: 60,
      relatedRemoteComicId: "comic-002",
    },
    {
      id: "proj-003",
      author: "白杨组",
      title: "测试项目三",
      pageCount: 5,
      unitCount: 90,
      translatedUnitCount: 40,
      proovedUnitCount: 10,
    },
    {
      id: "proj-005",
      author: "白杨组",
      title: "完结项目五",
      pageCount: 15,
      unitCount: 300,
      translatedUnitCount: 300,
      proovedUnitCount: 300,
    },
    {
      id: "proj-006",
      author: "新人组",
      title: "练习项目六",
      pageCount: 3,
      unitCount: 50,
      translatedUnitCount: 10,
      proovedUnitCount: 2,
    },
  ];
}
