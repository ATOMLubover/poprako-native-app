import "./VerticalStatusCard.css";
import { useEffect, useState } from "react";
import { Project } from "../../models/project";
import { getProjectPages } from "../../ipc/project";
import { proxyLocalImage } from "../../ipc/image";
import { getLocalPostProcessors } from "../../ipc/project/plugin";
import { exportProject, openProjectDir } from "../../ipc/project/port";
import type { PostProcessor } from "../../models/project";
import { useToast } from "../NotificationToast";
import { Type, Check, FileText, Layers, Image as ImageIcon } from "lucide-react";
import ProgressBar from "../ProgressBar";
import NatureButton from "../NatureButton";
import NatureSwitchButton from "../NatureSwitchButton";
import InPanelIcon from "../InPanelIcon";
import OutPanelIcon from "../OutPanelIcon";

type VerticalStatusCardProps = {
  project: Project;
};

export default function VerticalStatusCard({ project }: VerticalStatusCardProps) {
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [postProcessors, setPostProcessors] = useState<PostProcessor[]>([]);
  const [selectedProcessors, setSelectedProcessors] = useState<string[]>([]);
  const [exportToZip, setExportToZip] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    let isMounted = true;
    async function fetchCover() {
      try {
        const pages = await getProjectPages(project.id);
        if (pages.length > 0) {
          const firstPage = pages[0];
          if (firstPage.localImageUrl) {
             const url = await proxyLocalImage(firstPage.localImageUrl);
             if (isMounted) setCoverUrl(url);
          } else if (firstPage.remoteImageUrl) {
             if (isMounted) setCoverUrl(firstPage.remoteImageUrl);
          }
        }
      } catch (e) {
        console.error("Failed to fetch cover", e);
      }
    }
    fetchCover();
    return () => { isMounted = false; };
  }, [project.id]);

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

  const author = project.author ?? "";
  const title = project.title ?? "";
  const trPercent = project.unitCount > 0
    ? (project.translatedUnitCount / project.unitCount) * 100
    : 0;
  const prPercent = project.unitCount > 0
    ? (project.proovedUnitCount / project.unitCount) * 100
    : 0;

  const tr = Math.max(0, Math.min(100, Math.round(trPercent)));
  const pr = Math.max(0, Math.min(100, Math.round(prPercent)));

  const handleExportClick = () => {
    setIsExporting(true);
    setSelectedProcessors([]);
  };

  const handleCancelExport = () => {
    setIsExporting(false);
    setSelectedProcessors([]);
  };

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
    try {
      const path = await exportProject(project.id, exportToZip, selectedProcessors);
      showToast("success", `项目导出成功: ${path}`);
      setIsExporting(false);
      setSelectedProcessors([]);
    } catch (e) {
      showToast("error", `导出失败: ${(e as Error).message}`);
    }
  };

  const handleOpenProjectDir = async () => {
    if (!project.localImageDir || project.localImageDir.trim() === "") {
      showToast("error", "项目没有本地图片目录");
      return;
    }

    try {
      await openProjectDir(project.localImageDir);
      showToast("success", "已打开项目目录");
    } catch (e) {
      showToast("error", `打开项目目录失败: ${(e as Error).message}`);
    }
  };

  return (
    <>
      <div className={`vsc-image-container ${isExporting ? 'collapsed' : ''}`}>
        <div className="vsc-image-box" aria-hidden>
          {coverUrl ? (
            <img src={coverUrl} alt={title} className="vsc-image" />
          ) : (
            <div className="vsc-placeholder">
              <ImageIcon size={48} strokeWidth={1.5} />
            </div>
          )}
        </div>
      </div>

      <div className="vsc-content">
        <div className="vsc-title" title={author ? `【${author}】${title}` : title}>
          {author ? `【${author}】${title}` : title}
        </div>

        <div className="vsc-progress-wrap" aria-hidden>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%" }}>
            <div style={{ width: "80%" }}>
              <ProgressBar
                items={[
                  { color: "#fed7aa", length: tr },
                  { color: "#bbf7d0", length: pr },
                ]}
                height={8}
              />
            </div>
          </div>
        </div>

        <div className="vsc-metrics-grid">
          <div className="vsc-metric-card" title="Pages">
            <div className="vsc-metric-title">
              <FileText size={16} />
              <span>总页数</span>
            </div>
            <div className="vsc-metric-value">{project.pageCount}</div>
          </div>

          <div className="vsc-metric-card" title="Units">
            <div className="vsc-metric-title">
              <Layers size={16} />
              <span>总标记</span>
            </div>
            <div className="vsc-metric-value">{project.unitCount}</div>
          </div>

          <div className="vsc-metric-card" title="Translated">
            <div className="vsc-metric-title">
              <Type size={16} />
              <span>已翻译</span>
            </div>
            <div className="vsc-metric-value">{project.translatedUnitCount}</div>
          </div>

          <div className="vsc-metric-card" title="Prooved">
            <div className="vsc-metric-title">
              <Check size={16} />
              <span>已校对</span>
            </div>
            <div className="vsc-metric-value">{project.proovedUnitCount}</div>
          </div>

          <div className="vsc-metric-card" title="Inbox">
            <div className="vsc-metric-title">
              <InPanelIcon size={20} />
              <span>框内</span>
            </div>
            <div className="vsc-metric-value">{project.inboxUnitCount ?? 0}</div>
          </div>

          <div className="vsc-metric-card" title="Outbox">
            <div className="vsc-metric-title">
              <OutPanelIcon size={20} />
              <span>框外</span>
            </div>
            <div className="vsc-metric-value">{project.outboxUnitCount ?? 0}</div>
          </div>
        </div>
      </div>

      <div className={`vsc-postproc-selector ${isExporting ? 'open' : 'closed'}`}>
        <div className="vsc-postproc-header">
          <div className="vsc-postproc-title">选择后处理配置</div>
          <div className="vsc-postproc-actions">
            <NatureSwitchButton
              initialState={exportToZip ? "on" : "off"}
              onToggle={(s) => setExportToZip(s === "on")}
              width={140}
              height={28}
              onText="启用压缩"
              offText="启用压缩"
            />
          </div>
        </div>
        <div className="vsc-postproc-list">
          {postProcessors.length === 0 ? (
            <div className="vsc-postproc-placeholder">暂无后处理器</div>
          ) : (
            postProcessors.map(proc => (
              <div
                key={proc.name}
                className={`vsc-postproc-entry ${selectedProcessors.includes(proc.name) ? 'selected' : ''}`}
                onClick={() => handleProcessorToggle(proc.name)}
              >
                {proc.name}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="vsc-export-wrap">
        <div className="vsc-export-inner">
          {!isExporting ? (
            <>
              <NatureButton
                variant="cloud"
                minWidth={0}
                onClick={handleOpenProjectDir}
              >打开项目目录</NatureButton>

              <NatureButton
                variant="mist"
                minWidth={0}
                onClick={handleExportClick}
              >导出</NatureButton>
            </>
          ) : (
            <>
              <NatureButton
                variant="cloud"
                minWidth={0}
                onClick={handleCancelExport}
              >取消</NatureButton>
              <NatureButton
                variant="mist"
                minWidth={0}
                onClick={handleConfirmExport}
              >导出</NatureButton>
            </>
          )}
        </div>
      </div>
    </>
  );
}
