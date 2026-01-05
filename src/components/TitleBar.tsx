// 自定义窗口标题栏组件
// 用于无装饰窗口的拖拽区域和窗口控制

import { minimizeWindow, maximizeWindow, closeWindow } from "../ipc/window";
import "./TitleBar.css";

export default function TitleBar() {
  const handleMinimize = () => {
    minimizeWindow().catch(console.error);
  };

  const handleMaximize = () => {
    maximizeWindow().catch(console.error);
  };

  const handleClose = () => {
    closeWindow().catch(console.error);
  };

  return (
    <div className="titlebar" data-tauri-drag-region>
      <div className="titlebar-controls">
        <button
          type="button"
          className="titlebar-btn titlebar-btn-minimize"
          onClick={handleMinimize}
          aria-label="最小化"
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        <button
          type="button"
          className="titlebar-btn titlebar-btn-maximize"
          onClick={handleMaximize}
          aria-label="最大化"
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" />
          </svg>
        </button>

        <button
          type="button"
          className="titlebar-btn titlebar-btn-close"
          onClick={handleClose}
          aria-label="关闭"
          style={{ WebkitAppRegion: 'no-drag' } as any}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
