import { useState } from "react";
import { NewTerm } from "../models/term";
import NatureButton from "./NatureButton";
import "./TermCreator.css";

type TermCreatorProps = {
  onCreate?: (t: NewTerm) => void;
  onExit?: () => void;
};

/**
 * 术语创建卡片（草稿板预览）
 * - 采用与 TagDetailModifier 相似的卡片布局与底部按钮样式
 * - 限制输入区高度，避免出现过长的编辑区导致错觉
 */
export default function TermCreator({ onCreate, onExit }: TermCreatorProps) {
  const [original, setOriginal] = useState<string>("");
  const [definition, setDefinition] = useState<string>("");

  const ORIGINAL_MAX = 50;
  const DEFINITION_MAX = 100;

  const canSubmit =
    original.trim().length > 0 &&
    definition.trim().length > 0 &&
    original.trim().length <= ORIGINAL_MAX &&
    definition.trim().length <= DEFINITION_MAX;

  const handleSubmit = () => {
    if (!canSubmit) {
      return;
    }

    const payload: NewTerm = {
      original: original.trim(),
      definition: definition.trim(),
    };

    if (onCreate) {
      onCreate(payload);
    } else {
      // 临时行为：打印到控制台以便快速验收
      console.log("Create term", payload);
    }

    setOriginal("");
    setDefinition("");
  };

  return (
    <div className={`modifier-card term-creator`}>
      <div>
        <h3 className="title">新建术语</h3>
      </div>

      <div className="input-group">
        <label className="label-text">原文</label>
        <input
          type="text"
          value={original}
          onChange={(e) => setOriginal(e.target.value)}
          placeholder="输入原文"
          maxLength={ORIGINAL_MAX}
        />
        <div className="helper-row">
          <div className="char-count">{original.length}/{ORIGINAL_MAX}</div>
        </div>
      </div>

      <div className="input-group">
        <label className="label-text">定义</label>
        <textarea
          value={definition}
          onChange={(e) => setDefinition(e.target.value)}
          placeholder="输入定义"
          maxLength={DEFINITION_MAX}
        />
        <div className="helper-row">
          <div className="char-count">{definition.length}/{DEFINITION_MAX}</div>
        </div>
      </div>

      <div className="action-footer">
        <div className="btn-wrapper">
          <NatureButton variant="cloud" onClick={() => { if (onExit) { onExit(); } else { setOriginal(""); setDefinition(""); } }}>
            取消
          </NatureButton>
        </div>

        <div className="btn-wrapper">
          <NatureButton variant="mist" disabled={!canSubmit} onClick={handleSubmit}>
            创建
          </NatureButton>
        </div>
      </div>
    </div>
  );
}
