import TermbaseList from "../components/TermbaseList";
import "./TermbasePage.css";

/*
 构建背景装饰图标的经验（备忘）

 - 将装饰 SVG 作为容器内的独立元素插入，容器需 `position: relative`，SVG 使用 `position: absolute`。
 - 通过负偏移（例如 `right: -10px`/`-30px`、`bottom: -10px`/`-30px`）制造溢出感，避免改变内部元素的 padding/布局。
 - 把 SVG 放在 `z-index: 0`，并确保上层标题/内容设置 `position: relative` 且 `z-index: 1`，以保证可读性和交互。
 - 使用 `pointerEvents: none` 防止装饰阻塞鼠标事件。
 - 装饰颜色建议使用主题色或低对比中性色（示例使用 `#3d403d`）并降低不透明度（0.04-0.08），以免干扰主体信息。
 - SVG 使用 `fill="none"` 和 `stroke="currentColor"` 的组合可以让颜色继承并便于管理。
 - 通过增加 SVG 尺寸（例如 120px -> 200px）并旋转（例如 `rotate(-15deg)`）可以获得更柔和、具有纹理感的背景效果。
 - 将装饰视为纯视觉纹理，避免包含必需信息或交互内容。

 以上为实现该背景纹理时的关键点，便于在其他页面复用同样模式。
*/

/**
 * TermbasePage 组件
 * - 左列：最新术语库 + 搜索（主内容区，白色背景）
 * - 右列：高赞术语库（侧边栏，浅色背景，视觉降级）
 */
export default function TermbasePage() {
  return (
    <div className="termbase-page">
      <div className="termbase-page-content">
        <div style={{ display: "flex", height: "100%", minHeight: 0 }}>
          {/* 左列：主内容区 */}
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: "0 24px 24px 24px", position: "relative" }}>
            {/* 背景装饰图标：右下角，z-index 0 */}
            <svg
              style={{
                position: "absolute",
                right: "-5px",
                bottom: "-10px",
                width: "200px",
                height: "200px",
                color: "#3d403d",
                opacity: 0.06,
                transform: "rotate(-15deg)",
                zIndex: 0,
                pointerEvents: "none",
              }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.168.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.168.477-4.5 1.253M14 10l2 2m0 0l2 2m-2-2l-2 2m2-2l2-2"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 10h.01M9 13h.01M9 16h.01M15 10h.01M15 13h.01M15 16h.01"
              />
            </svg>

            <h1 className="termbase-title" style={{ textAlign: "left", paddingLeft: 0, margin: "2px 0 20px 0", position: "relative", zIndex: 1 }}>
              术语库一览
            </h1>
            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", position: "relative", zIndex: 1 }}>
              <TermbaseList />
            </div>
          </div>

          {/* 分隔线：独立元素，带上下 margin */}
          <div style={{ width: "2px", background: "#cbd5e1", alignSelf: "stretch", margin: "24px 0" }} />


          {/* 右列：侧边栏（高赞推荐） */}
          <div
            style={{
              width: 320,
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              background: "#f9fbfbff",
              padding: "24px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
                  fill="#fcfcfcff"
                  stroke="#000000"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#475569" }}>TRENDING</h2>
            </div>

            <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
              <TermbaseList showInput={false} limit={3} singleColumn={true} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
