import "./ProjectStatusCard.css";
import ProgressBar from "../ProgressBar";
import NatureButton from "../NatureButton";
import { Type, Check, Cloud, HardDrive, FileText, Layers } from "lucide-react";
import type { Project } from "../../models/project";

type ProjectStatusCardProps = {
  project: Project;
  onAct?: (project: Project) => void;
  onSync?: (project: Project) => void;
};

// 极简 ProjectStatusCard 组件，仅接受 Project DTO
export default function ProjectStatusCard({ project, onAct, onSync }: ProjectStatusCardProps) {
  const author = project.author ?? "";
  const title = project.title ?? "";
  const pages = project.pageCount ?? 0;
  const units = project.unitCount ?? 0;

  const trPercent = project.unitCount > 0
    ? (project.translatedUnitCount / project.unitCount) * 100
    : 0;
  const prPercent = project.unitCount > 0
    ? (project.proovedUnitCount / project.unitCount) * 100
    : 0;

  const tr = Math.max(0, Math.min(100, Math.round(trPercent)));
  const pr = Math.max(0, Math.min(100, Math.round(prPercent)));
  const remote = Boolean(project.relatedRemoteComicId);

  const translatedCount = project.translatedUnitCount;
  const proovedCount = project.proovedUnitCount;

  return (
    <div className="psc-root">
      <div className="psc-left">
        <div className="psc-icon" aria-hidden>
          {remote ? <Cloud size={18} /> : <HardDrive size={18} />}
        </div>

        <div className="psc-main">
          <div style={{ minWidth: 0 }}>
            <span className="psc-title">{author ? `【${author}】${title}` : title}</span>
          </div>
        </div>
      </div>

      <div className="psc-metrics">
        <div className="psc-metric-row">
          <div className="psc-metric-item" title="pages">
            <FileText size={16} />
            <span>{pages}</span>
          </div>

          <div className="psc-metric-item" title="units">
            <Layers size={16} />
            <span>{units}</span>
          </div>

          <div className="psc-metric-item" title="translated">
            <Type size={16} />
            <span>{translatedCount}</span>
          </div>

          <div className="psc-metric-item" title="prooved">
            <Check size={16} />
            <span>{proovedCount}</span>
          </div>
        </div>

        <div className="psc-progress-wrap" aria-hidden>
          <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
            <div style={{ width: "100%" }}>
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
      </div>

      <div className="psc-right">
        <div style={{ marginLeft: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <NatureButton
            variant="mist"
            minWidth={56}
            onClick={() => {
              if (onAct) onAct(project);
            }}
          >开始</NatureButton>
          {remote ? (
            <NatureButton
              variant="cloud"
              minWidth={56}
              onClick={() => {
                if (onSync) onSync(project);
              }}
            >同步</NatureButton>
          ) : null}
        </div>
      </div>
    </div>
  );
}
