import { useEffect, useRef, useState } from "react";
import NatureButton from "../NatureButton";
import { User, FileText, Folder } from "lucide-react";
import { selectNewProjectDir } from "../../ipc/project";
import { createLocalProject } from "../../store/project";
import { useToast } from "../NotificationToast";
import type { NewLocalProject } from "../../models/project";
import "../TermbaseCreator.css";

type Props = {
  initial?: Partial<NewLocalProject>;
  onSave?: (payload: NewLocalProject) => void;
  onCancel?: () => void;
};

export default function LocalProjectCreator({ initial = {}, onSave, onCancel }: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  const { showToast } = useToast();

  const [author, setAuthor] = useState<string>(initial.author ?? "");
  const [title, setTitle] = useState<string>(initial.title ?? "");
  const [localImageDir, setLocalImageDir] = useState<string>(initial.localImageDir ?? "");
  const [saving, setSaving] = useState<boolean>(false);

  // Initialize once on mount to avoid overwriting after HMR
  useEffect(() => {
    setAuthor(initial.author ?? "");
    setTitle(initial.title ?? "");

    if (initial.localImageDir) {
      setLocalImageDir(initial.localImageDir);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSelectDir() {
    try {
      const res = await selectNewProjectDir();

      if (!res || typeof res !== "object" || !(res as any).dir_path) {
        showToast("info", "未选择图片文件");
        return;
      }

      const obj = res as { dir_path: string; image_count: number };

      showToast("success", `已选择 ${obj.image_count} 张图片`);

      setLocalImageDir(obj.dir_path || "");
    } catch (e) {
      console.error("Select project dir failed", e);
      showToast("error", "读取所选目录失败");
    }
  }

  async function handleSave() {
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

    try {
      await createLocalProject(payload);
      setSaving(false);

      if (onSave) {
        onSave(payload);
      }
    } catch (e) {
      setSaving(false);
      console.error("Create local project failed", e);
      showToast("error", "创建本地项目失败");
    }
  }

  return (
    <div className="termbase-creator-card" ref={rootRef}>
      <div className="tbc-header tbc-header-centered">
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111827" }}>新建本地项目</h3>
      </div>

        <div className="tbc-field">
          <div className="tbc-field-icon">
            <Folder size={18} />
          </div>

          <div style={{ flex: 1, display: "flex", gap: 8 }}>
            <input
              className="tbc-input tbc-preview"
              value={localImageDir ?? ""}
              title={localImageDir ?? ""}
              readOnly
              placeholder="请选择本地图片目录"
              style={{ flex: 1, minWidth: 0 }}
            />

            <NatureButton variant="mist" onClick={handleSelectDir} minWidth={70}>
              选择
            </NatureButton>
          </div>
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
