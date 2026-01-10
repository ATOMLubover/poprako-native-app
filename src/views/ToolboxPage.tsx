// 工具箱页面
// 前端注释使用中文，顶部悬浮栏切换工具内容

import { useState } from "react";
import { CompressorPage } from "./CompressorPage";
import FontRepoPage from "./FontRepoPage";
import TabBar from "../components/TabBar";
import "./ToolboxPage.css";

type ToolItem = "compressor" | "font-repo";

export default function ToolboxPage() {
  const [activeTool, setActiveTool] = useState<ToolItem>("compressor");

  return (
    <div className="toolbox-page">
      <div className="tab-bar-wrapper">
        <TabBar
          items={[
            { id: "compressor", label: "压图工具" },
            { id: "font-repo", label: "字体仓库" },
          ]}
          activeTab={activeTool}
          onTabChange={setActiveTool}
        />
      </div>

      <div className="toolbox-content">
        {activeTool === "compressor" && <CompressorPage />}
        {activeTool === "font-repo" && <FontRepoPage />}
      </div>
    </div>
  );
}
