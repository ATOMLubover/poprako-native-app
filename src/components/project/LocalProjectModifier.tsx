import { useEffect, useState } from "react";
import NatureButton from "../NatureButton";
import { User, FileText } from "lucide-react";
import { updateProject } from "../../ipc/project";
import { useToast } from "../NotificationToast";
import type { Project } from "../../models/project";
import "../TermbaseCreator.css";

type Props = {
  project: Project;
  onSave?: () => void;
  onCancel?: () => void;
};

export default function LocalProjectModifier({ project, onSave, onCancel }: Props) {
  const { showToast } = useToast();

  const [author, setAuthor] = useState<string>(project.author);
  const [title, setTitle] = useState<string>(project.title);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    setAuthor(project.author);
    setTitle(project.title);
  }, [project]);

  async function handleSave() {
    if (!author || !title) {
      console.warn("Missing required fields");
      return;
    }

    setSaving(true);

    const updatedProject: Project = {
      ...project,
      author,
      title,
    };

    try {
      await updateProject(updatedProject);

      setSaving(false);

      showToast("success", "项目信息已更新");

      if (onSave) {
        onSave();
      }
    } catch (e) {
      setSaving(false);
      console.error("Update project failed", e);
      showToast("error", `更新项目失败: ${(e as Error).message || String(e)}`);
    }
  }

  return (
    <div className="termbase-creator-card">
      <div className="tbc-header tbc-header-centered">
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111827" }}>修改项目信息</h3>
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
              {saving ? "保存中..." : "保存"}
            </NatureButton>
          </div>
        </div>
      </div>
    </div>
  );
}
