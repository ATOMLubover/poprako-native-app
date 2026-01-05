// 工具箱页面
// 前端注释使用中文，顶部悬浮栏切换工具内容

import { useState } from "react";
import { CompressorPage } from "./CompressorPage";
import FontRepoPage from "./FontRepoPage";
import "./ToolboxPage.css";

type ToolItem = "compressor" | "font-repo";

export default function ToolboxPage() {
  const [activeTool, setActiveTool] = useState<ToolItem>("compressor");

  return (
    <div className="toolbox-page">
      <div className="toolbox-tab-bar">
        <button
          className={`toolbox-tab ${activeTool === "compressor" ? "active" : ""}`}
          onClick={() => setActiveTool("compressor")}
        >
          压图工具
        </button>
        <button
          className={`toolbox-tab ${activeTool === "font-repo" ? "active" : ""}`}
          onClick={() => setActiveTool("font-repo")}
        >
          字体仓库
        </button>
      </div>

      <div className="toolbox-content">
        {activeTool === "compressor" && <CompressorPage />}
        {activeTool === "font-repo" && <FontRepoPage />}
      </div>
    </div>
  );
}
