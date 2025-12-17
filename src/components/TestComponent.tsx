import DotLoadSpinner from "./DotLoadSpinner";
import "./TestComponent.css";

/**
 * 测试白板组件
 * 用于在正式整合到项目之前测试新组件的效果
 */
export default function TestComponent() {
  return (
    <div className="test-component">
      <div className="test-header">
        <h2>组件测试白板</h2>
        <p>在此区域测试新组件的展示效果</p>
      </div>

      <div className="test-content">
        <div className="test-section">
          <h3>DotLoadSpinner 组件演示</h3>
          <div className="test-demo-area">
            <DotLoadSpinner />
          </div>
        </div>
      </div>
    </div>
  );
}
