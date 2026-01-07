import { useEffect, useState } from "react";
import NatureButton from "../NatureButton";
import NatureSwitchButton from "../NatureSwitchButton";
import { exportProject } from "../../ipc/project/port";
import { getLocalPostProcessors } from "../../ipc/project/plugin";
import { useToast } from "../NotificationToast";
import type { Project, PostProcessor } from "../../models/project";
import { Type, Check, FileText, Layers } from "lucide-react";
import InPanelIcon from "../InPanelIcon";
import OutPanelIcon from "../OutPanelIcon";
import "./LocalProjectExporter.css";

type Props = {
  project: Project;
  onSuccess?: (path: string) => void;
  onCancel?: () => void;
};

export default function LocalProjectExporter({ project, onSuccess, onCancel }: Props) {
  const { showToast } = useToast();

  const [postProcessors, setPostProcessors] = useState<PostProcessor[]>([]);
  const [selectedProcessors, setSelectedProcessors] = useState<string[]>([]);
  const [exportToZip, setExportToZip] = useState(false);
  const [exporting, setExporting] = useState<boolean>(false);

  useEffect(() => {
    async function fetchProcessors() {
      try {
        const procs = await getLocalPostProcessors();
        setPostProcessors(procs);
      } catch (e) {
        console.error("Failed to fetch post processors", e);
      }
    }

    fetchProcessors();
  }, []);

  const handleProcessorToggle = (name: string) => {
    setSelectedProcessors(prev => {
      if (prev.includes(name)) {
        return prev.filter(n => n !== name);
      } else {
        return [...prev, name];
      }
    });
  };

  const handleConfirmExport = async () => {
    setExporting(true);

    try {
      const path = await exportProject(project.id, exportToZip, selectedProcessors);

      setExporting(false);

      showToast("success", `项目导出成功: ${path}`);

      if (onSuccess) {
        onSuccess(path);
      }
    } catch (e) {
      setExporting(false);
      console.error("Export project failed", e);
      showToast("error", `导出失败: ${(e as Error).message || String(e)}`);
    }
  };

  return (
    <div className="lpe-card">
      <div className="lpe-header">
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#111827" }}>导出项目</h3>
      </div>

      <div className="lpe-content">
        <div className="lpe-metrics-column">
          <div className="lpe-metrics-grid">
            <div className="lpe-metric-card" title="Pages">
              <div className="lpe-metric-title">
                <FileText size={16} />
                <span>总页数</span>
              </div>
              <div className="lpe-metric-value">{project.pageCount}</div>
            </div>

            <div className="lpe-metric-card" title="Units">
              <div className="lpe-metric-title">
                <Layers size={16} />
                <span>总标记</span>
              </div>
              <div className="lpe-metric-value">{project.unitCount}</div>
            </div>

            <div className="lpe-metric-card" title="Translated">
              <div className="lpe-metric-title">
                <Type size={16} />
                <span>已翻译</span>
              </div>
              <div className="lpe-metric-value">{project.translatedUnitCount}</div>
            </div>

            <div className="lpe-metric-card" title="Prooved">
              <div className="lpe-metric-title">
                <Check size={16} />
                <span>已校对</span>
              </div>
              <div className="lpe-metric-value">{project.proovedUnitCount}</div>
            </div>

            <div className="lpe-metric-card" title="Inbox">
              <div className="lpe-metric-title">
                <InPanelIcon size={20} />
                <span>框内</span>
              </div>
              <div className="lpe-metric-value">{project.inboxUnitCount ?? 0}</div>
            </div>

            <div className="lpe-metric-card" title="Outbox">
              <div className="lpe-metric-title">
                <OutPanelIcon size={20} />
                <span>框外</span>
              </div>
              <div className="lpe-metric-value">{project.outboxUnitCount ?? 0}</div>
            </div>
          </div>
        </div>

        <div className="lpe-processor-column">
          <div className="lpe-processor-header">
            <div className="lpe-processor-title">后处理器</div>
            <NatureSwitchButton
              initialState={exportToZip ? "on" : "off"}
              onToggle={(s) => setExportToZip(s === "on")}
              width={140}
              height={28}
              onText="启用压缩"
              offText="启用压缩"
            />
          </div>

          <div className="lpe-processor-list">
            {postProcessors.length === 0 ? (
              <div className="lpe-processor-placeholder">暂无后处理器</div>
            ) : (
              postProcessors.map(proc => (
                <div
                  key={proc.name}
                  className={`lpe-processor-entry ${selectedProcessors.includes(proc.name) ? 'selected' : ''}`}
                  onClick={() => handleProcessorToggle(proc.name)}
                >
                  {proc.name}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="lpe-footer">
        <NatureButton variant="cloud" onClick={() => onCancel && onCancel()} minWidth={0}>
          取消
        </NatureButton>

        <NatureButton variant="mist" onClick={() => handleConfirmExport()} disabled={exporting} minWidth={0}>
          {exporting ? "导出中..." : "导出"}
        </NatureButton>
      </div>
    </div>
  );
}
