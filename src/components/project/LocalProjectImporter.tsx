import { useEffect, useRef, useState } from "react";
import NatureButton from "../NatureButton";
import { User, FileText, FolderArchive } from "lucide-react";
import { selectArchivedProjectPath, importProject } from "../../ipc/project";
import { useToast } from "../NotificationToast";
import "../TermbaseCreator.css";

type Props = {
  onSuccess?: () => void;
  onCancel?: () => void;
};

export default function LocalProjectImporter({ onSuccess, onCancel }: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  const { showToast } = useToast();

  const [author, setAuthor] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [projectPath, setProjectPath] = useState<string>("");
  const [importing, setImporting] = useState<boolean>(false);

  useEffect(() => {
    setAuthor("");
    setTitle("");
    setProjectPath("");
  }, []);

  async function handleSelectPath() {
    try {
      const res = await selectArchivedProjectPath();

      if (!res) {
        showToast("info", "未选择项目文件");
        return;
      }

      // const path = res.replace(/\u0000/g, "").trim();

      setProjectPath(res);
      showToast("success", "已选择项目文件");
    } catch (e) {
      console.error("Select archived project path failed", e);
      showToast("error", "读取所选文件失败");
    }
  }

  async function handleImport() {
    if (!author || !title || !projectPath) {
      console.warn("Missing required fields");
      return;
    }

    setImporting(true);

    try {
      await importProject(projectPath, author, title);

      setImporting(false);
      showToast("success", "项目导入成功");

      if (onSuccess) {
        onSuccess();
      }
    } catch (e) {
      setImporting(false);
      console.error("Import project failed", e);
      showToast("error", `导入项目失败: ${(e as Error).message || String(e)}`);
    }
  }

  return (
    <div className="termbase-creator-card" ref={rootRef}>
      <div className="tbc-header tbc-header-centered">
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111827" }}>导入项目</h3>
      </div>

      <div className="tbc-body">
        <div className="tbc-field">
          <div className="tbc-field-icon">
            <FolderArchive size={18} />
          </div>

          <div style={{ flex: 1, display: "flex", gap: 8 }}>
            <input
              className="tbc-input tbc-preview"
              value={projectPath ?? ""}
              title={projectPath ?? ""}
              readOnly
              placeholder="请选择要导入的项目文件"
              style={{ flex: 1, minWidth: 0 }}
            />

            <NatureButton variant="mist" onClick={handleSelectPath} minWidth={70}>
              选择
            </NatureButton>
          </div>
        </div>

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
            <NatureButton 
              variant="mist" 
              onClick={() => handleImport()} 
              disabled={importing || !projectPath || !author || !title}
            >
              {importing ? "导入中..." : "导入"}
            </NatureButton>
          </div>
        </div>
      </div>
    </div>
  );
}
