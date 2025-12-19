import TermbaseList from "../components/TermbaseList";
import "./TermbasePage.css";

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
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", padding: "0 24px 24px 24px" }}>
            <h1 className="termbase-title" style={{ textAlign: "left", paddingLeft: 0, margin: "10px 0 20px 0" }}>
              术语库一览
            </h1>
            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              <TermbaseList />
            </div>
          </div>

          {/* 右列：侧边栏（高赞推荐） */}
          <div
            style={{
              width: 320,
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
              background: "#f8fafc",
              borderLeft: "1px solid #e2e8f0",
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
