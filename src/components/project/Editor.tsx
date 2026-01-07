import React, { useRef, useState, useEffect, forwardRef, useImperativeHandle } from "react";
import "./Editor.css";
import { firstNonEmpty } from "../../util/string";

type EditorProps = {
  indexInPage: number;
  isInsideBox: boolean;
  symbols: string[];
  initialText: string;
  totalUnits: number;
  onTextModify: (newText: string) => void;
  onStatusClick: () => void;
  onIndexChange: (targetIndex: number) => void;
  /**
   * 恢复按钮回调（用于通知父组件清空校对文本）
   * 必需：父组件必须提供实现以清空校对文本
   */
  onRestore: () => void;
  /** 翻译文本（用于在恢复时视觉上展示） */
  translatedText: string;
  /** 当前是否为校对模式（用于 placeholder 文案） */
  isProofMode: boolean;
};

export type EditorRef = {
  /**
   * 聚焦到 textarea，可选是否移到文本尾部
   */
  focus: (toEnd?: boolean) => void;
};

const Editor = forwardRef<EditorRef, EditorProps>((
  {
    indexInPage,
    isInsideBox,
    symbols,
    initialText,
    totalUnits,
    onTextModify,
    onStatusClick,
    onIndexChange,
    onRestore,
    translatedText,
    isProofMode,
  },
  ref
) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState(initialText);
  const [editingIndex, setEditingIndex] = useState(false);
  const [indexInput, setIndexInput] = useState(String(indexInPage));

  useImperativeHandle(ref, () => ({
    focus: (toEnd?: boolean) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      textarea.focus();

      if (toEnd) {
        // 将光标移到文本尾部
        const len = textarea.value.length;
        textarea.setSelectionRange(len, len);
      }
    },
  }));

  useEffect(() => {
    setText(initialText);
  }, [initialText]);

  // 在光标位置插入符号
  const insertSymbol = (symbol: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;

    const beforeText = text.substring(0, startPos);
    const afterText = text.substring(endPos);

    const newValue = beforeText + symbol + afterText;
    setText(newValue);
    onTextModify(newValue);

    setTimeout(() => {
      const newPos = startPos + symbol.length;
      textarea.focus();
      textarea.setSelectionRange(newPos, newPos);
    }, 0);
  };

  // 文本变化处理
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    console.log("[Editor] handleTextChange, newValue:", newValue);
    setText(newValue);
    onTextModify(newValue);
  };

  const handleIndexClick = () => {
    setEditingIndex(true);
    setIndexInput(String(indexInPage));
  };

  const confirmIndex = (raw: string) => {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isNaN(parsed)) {
      console.log("[Editor] Invalid index input", raw);
      setEditingIndex(false);
      return;
    }

    // 用户输入为 1-based，界面与交互均使用 1-based
    const maxOneBased = Math.max(totalUnits, 1);
    let userOneBased = parsed;
    if (userOneBased < 1) userOneBased = 1;
    if (userOneBased > maxOneBased) userOneBased = maxOneBased;

    // 将 1-based 的目标传回给父组件，由父组件决定如何转换到数组索引
    const targetOneBased = userOneBased;
    onIndexChange(targetOneBased);
    setEditingIndex(false);
  };

  const cancelEdit = () => {
    setEditingIndex(false);
  };

  // 点击“复制”按钮：通知父组件清空校对文本，视觉上将输入框展示为翻译文本
  const handleRestoreClick = () => {
    console.log("[Editor] Restore clicked, show translation text");

    // 通知父组件清空校对文本（父组件必需提供实现）
    onRestore();

    // 将输入框内容切换为翻译文本（优先使用传入的 translatedText，忽略空字符串）
    const showText = firstNonEmpty(translatedText, initialText, "") ?? "";
    setText(showText);

    // 尝试聚焦到文本尾部，提升体验
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.focus();

      const len = showText.length;
      textarea.setSelectionRange(len, len);
    }
  };

  return (
    <div className="editor-card">
      <div className="card-header">
        {editingIndex ? (
          <input
            className="index-input"
            value={indexInput}
            onChange={(e) => setIndexInput(e.target.value)}
            onBlur={() => confirmIndex(indexInput)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                confirmIndex(indexInput);
              }

              if (e.key === "Escape") {
                cancelEdit();
              }
            }}
            autoFocus
          />
        ) : (
          <span className="index-label" onClick={handleIndexClick}>
            {String(indexInPage).padStart(2, "0")}
          </span>
        )}

        <div className="status-group">
          <span className="restore-tag" role="button" tabIndex={0} onClick={handleRestoreClick} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleRestoreClick(); } }}>
            复制
          </span>

          <span
            className={`status-tag ${isInsideBox ? "tag-in" : "tag-out"}`}
            onClick={onStatusClick}
          >
            {isInsideBox ? "框内" : "框外"}
          </span>
        </div>
      </div>

      <div className="symbol-bar">
        {symbols.map((symbol, index) => (
          <button
            key={index}
            className="symbol-btn"
            onClick={() => insertSymbol(symbol)}
          >
            {symbol}
          </button>
        ))}
      </div>

      <div className="input-wrapper">
        <textarea
          ref={textareaRef}
          className="editor-textarea"
          placeholder={isProofMode ? "请输入校对" : "请输入翻译..."}
          value={text}
          onChange={handleTextChange}
        />
      </div>
    </div>
  );
});

Editor.displayName = "Editor";

export default Editor;
