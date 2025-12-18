import TermbaseList from "../components/TermbaseList";
import "./TermbasePage.css";

/**
 * TermbasePage 组件
 * - 术语库主页面
 * - 包含标题和列表
 */
export default function TermbasePage() {
  return (
    <div className="termbase-page">
      <h1 className="termbase-title">术语库</h1>

      <div className="termbase-page-content">
        <TermbaseList />
      </div>
    </div>
  );
}
