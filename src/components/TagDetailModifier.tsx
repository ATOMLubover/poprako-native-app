import { useEffect, useRef, useState } from "react";
import "./TagDetailModifier.css";
import NatureButton from "./NatureButton";

type TagPayload = {
  name: string;
  picaTags: string[];
  ehTags: string[];
};

type Props = {
  initialName?: string;
  initialPicaTags?: string[];
  initialEhTags?: string[];
  onSave?: (payload: TagPayload) => void;
  onCancel?: () => void;
};

/**
 * 标签编辑卡片
 * 支持编辑标签名称、Pica 标签和 EHentai 标签
 */
export default function TagDetailModifier({
  initialName = "和服 (Kimono)",
  initialPicaTags = ["和服", "传统服饰", "大和抚子"],
  initialEhTags = ["kimono", "female:kimono"],
  onSave,
  onCancel,
}: Props) {
  const [name, setName] = useState<string>(initialName);
  const [picaTags, setPicaTags] = useState<string[]>(initialPicaTags);
  const [ehTags, setEhTags] = useState<string[]>(initialEhTags);
  const [saving, setSaving] = useState<boolean>(false);
  const [playEnter, setPlayEnter] = useState<boolean>(false);
  const [activeAddType, setActiveAddType] = useState<"pica" | "eh" | null>(
    null
  );
  const [addInputValue, setAddInputValue] = useState<string>("");
  const addInputRef = useRef<HTMLInputElement | null>(null);
  const [newPicaNames, setNewPicaNames] = useState<string[]>([]);
  const [newEhNames, setNewEhNames] = useState<string[]>([]);

  useEffect(() => {
    setName(initialName);
    setPicaTags(initialPicaTags);
    setEhTags(initialEhTags);
    setNewPicaNames([]);
    setNewEhNames([]);
  }, [initialName, initialPicaTags, initialEhTags]);

  // 每次组件挂载时都重放入场动画
  useEffect(() => {
    setPlayEnter(false);
    requestAnimationFrame(() => {
      setPlayEnter(true);
    });

    return () => {
      setPlayEnter(false);
    };
  }, []);

  function removeTag(type: "pica" | "eh", index: number) {
    if (type === "pica") {
      const removed = picaTags[index];
      setPicaTags(picaTags.filter((_, i) => i !== index));
      setNewPicaNames(newPicaNames.filter((n) => n !== removed));
    } else {
      const removed = ehTags[index];
      setEhTags(ehTags.filter((_, i) => i !== index));
      setNewEhNames(newEhNames.filter((n) => n !== removed));
    }
  }

  function addTag(type: "pica" | "eh") {
    setActiveAddType(type);
    setAddInputValue("");

    requestAnimationFrame(() => {
      addInputRef.current?.focus();
    });
  }

  function addTagFromInput(type: "pica" | "eh") {
    const value = addInputValue.trim();
    if (!value) {
      cancelAdd();
      return;
    }

    if (type === "pica") {
      setPicaTags([...picaTags, value]);
      setNewPicaNames([...newPicaNames, value]);
    } else {
      setEhTags([...ehTags, value]);
      setNewEhNames([...newEhNames, value]);
    }

    setAddInputValue("");
    setActiveAddType(null);
  }

  function cancelAdd() {
    setActiveAddType(null);
    setAddInputValue("");
  }

  function handleSave() {
    setSaving(true);

    setTimeout(() => {
      setSaving(false);

      if (onSave) {
        onSave({ name, picaTags, ehTags });
      }
    }, 800);
  }

  return (
    <div className={`modifier-card${playEnter ? " enter" : ""}`}>
      <div className="input-group">
        <input
          type="text"
          className="name-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>

      <div className="tags-section">
        <label className="label-text">Pica 关联标签</label>
        <div className="tag-editable-list">
          {picaTags.map((tag, idx) => (
            <div
              key={`pica-${idx}`}
              className={`tag-pill tag-pica ${
                newPicaNames.includes(tag) ? "new-pica" : ""
              }`}
            >
              {tag}
              <span
                className="remove-btn"
                onClick={() => removeTag("pica", idx)}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </span>
            </div>
          ))}
          {activeAddType === "pica" ? (
            <div className="add-tag-trigger">
              <input
                ref={addInputRef}
                className="add-tag-input"
                value={addInputValue}
                onChange={(e) => setAddInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTagFromInput("pica");
                  }

                  if (e.key === "Escape") {
                    cancelAdd();
                  }
                }}
                onBlur={() => cancelAdd()}
              />
            </div>
          ) : (
            <div
              className="add-tag-trigger add-pica-btn"
              onClick={() => addTag("pica")}
            >
              添加 +
            </div>
          )}
        </div>
      </div>

      <div className="tags-section">
        <label className="label-text">EHentai 关联标签</label>
        <div className="tag-editable-list">
          {ehTags.map((tag, idx) => (
            <div
              key={`eh-${idx}`}
              className={`tag-pill tag-eh ${
                newEhNames.includes(tag) ? "new-eh" : ""
              }`}
            >
              {tag}
              <span
                className="remove-btn"
                onClick={() => removeTag("eh", idx)}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </span>
            </div>
          ))}
          {activeAddType === "eh" ? (
            <div className="add-tag-trigger">
              <input
                ref={addInputRef}
                className="add-tag-input"
                value={addInputValue}
                onChange={(e) => setAddInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTagFromInput("eh");
                  }

                  if (e.key === "Escape") {
                    cancelAdd();
                  }
                }}
                onBlur={() => cancelAdd()}
              />
            </div>
          ) : (
            <div
              className="add-tag-trigger add-eh-btn"
              onClick={() => addTag("eh")}
            >
              添加 +
            </div>
          )}
        </div>
      </div>

      <div className="action-footer">
        <div className="btn-wrapper">
          <NatureButton
            variant="cloud"
            onClick={() => onCancel && onCancel()}
          >
            取消修改
          </NatureButton>
        </div>

        <div className="btn-wrapper">
          <NatureButton
            variant="mist"
            onClick={() => handleSave()}
            disabled={saving}
          >
            {saving ? "保存中..." : "确认提交"}
          </NatureButton>
        </div>
      </div>
    </div>
  );
}
