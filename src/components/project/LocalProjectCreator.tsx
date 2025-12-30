import { useEffect, useRef, useState } from "react";
import NatureButton from "../NatureButton";
import { User, FileText, Folder } from "lucide-react";
import { selectProjectDir } from "../../ipc/project";
import { createLocalProject } from "../../store/project";
import type { NewLocalProject } from "../../models/project";
import "../TermbaseCreator.css";

type Props = {
  initial?: Partial<NewLocalProject>;
  onSave?: (payload: NewLocalProject) => void;
  onCancel?: () => void;
};

// 本地项目创建卡片，风格参考 TermbaseCreator
export default function LocalProjectCreator({ initial = {}, onSave, onCancel }: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  const [author, setAuthor] = useState<string>(initial.author ?? "");
  const [title, setTitle] = useState<string>(initial.title ?? "");
  const [localImageDir, setLocalImageDir] = useState<string>(initial.localImageDir ?? "");
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    setAuthor(initial.author ?? "");
    setTitle(initial.title ?? "");
    setLocalImageDir(initial.localImageDir ?? "");
  }, [initial]);

  async function handleSelectDir() {
    try {
      const path = await selectProjectDir();

      if (path) {
        setLocalImageDir(path);
      }
    } catch (e) {
      console.error("Select project dir failed", e);
    }
  }

  function handleSave() {
    if (!author || !title || !localImageDir) {
      console.warn("Missing required fields");
      return;
    }

    setSaving(true);

    const payload: NewLocalProject = {
      author,
      title,
      localImageDir,
    };

    createLocalProject(payload)
      .then(() => {
        setSaving(false);

        if (onSave) {
          onSave(payload);
        }
      })
      .catch((e) => {
        setSaving(false);
        console.error("Create local project failed", e);
      });
  }

  return (
    <div className="termbase-creator-card" ref={rootRef}>
      <div className="tbc-header tbc-header-centered">
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111827" }}>新建本地项目</h3>
      </div>
      <div className="tbc-body">
        <div className="tbc-field">
          <div className="tbc-field-icon">
            <User size={18} />
          </div>
          <input
            className="tbc-input"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="作者"
          />
        </div>

        <div className="tbc-field">
          <div className="tbc-field-icon">
            <FileText size={18} />
          </div>
          <input
            className="tbc-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="项目标题"
          />
        </div>

        <div className="tbc-field">
          <div className="tbc-field-icon">
            <Folder size={18} />
          </div>
          <div style={{ flex: 1, display: "flex", gap: 8 }}>
            <input
              className="tbc-input tbc-preview"
              value={localImageDir ?? ""}
              readOnly
              placeholder="请选择本地图片目录"
            />
            <NatureButton variant="mist" onClick={handleSelectDir} minWidth={70}>
              选择
            </NatureButton>
          </div>
        </div>

        <div style={{ height: 8 }} />

        <div className="tbc-footer">
          <div className="tbc-footer-btn">
            <NatureButton variant="cloud" onClick={() => onCancel && onCancel()}>
              取消
            </NatureButton>
          </div>

          <div style={{ width: 12 }} />

          <div className="tbc-footer-btn">
            <NatureButton variant="mist" onClick={() => handleSave()} disabled={saving}>
              {saving ? "创建中..." : "创建"}
            </NatureButton>
          </div>
        </div>
      </div>
    </div>
  );
}
