// 工具箱页面
// 前端注释使用中文，离线版本仅保留压图工具

import { CompressorPage } from "./CompressorPage";
import "./ToolboxPage.css";

export default function ToolboxPage() {
  return (
    <div className="toolbox-page">
      <div className="toolbox-content">
        <CompressorPage />
      </div>
    </div>
  );
}
