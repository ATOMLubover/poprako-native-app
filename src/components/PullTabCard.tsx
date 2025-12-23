import { useState } from "react";
import "./PullTabCard.css";

type Props = {};

// PullTabCard: 从 samples/pull-tab-card.html 本地化为 React 组件
// 备注：组件为纯展示用，可在 draft-board 中预览交互效果
export default function PullTabCard(_props: Props) {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  return (
    <div className={`pull-widget ${isExpanded ? "expanded" : ""}`}>
      <div className="pull-card pull-card-secondary">
        <div className="pull-title">附加信息</div>
        <p className="pull-desc">这里是隐藏的内容，可以通过点击按钮滑出查看详情。</p>
      </div>

      <div className="pull-card pull-card-primary">
        <div className="pull-title">自然设计</div>
        <p className="pull-desc">探索极简主义的交互美学，感受纯净的界面体验。</p>
        <button
          className="pull-action-btn"
          onClick={() => setIsExpanded((v) => !v)}
          aria-pressed={isExpanded}
        >
          {isExpanded ? "点击收回" : "点击展开"}
        </button>
        <div className="pull-icon-indicator" />
      </div>
    </div>
  );
}
