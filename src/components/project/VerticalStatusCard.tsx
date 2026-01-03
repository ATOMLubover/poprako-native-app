import "./VerticalStatusCard.css";
import { useEffect, useState } from "react";
import { Project } from "../../models/project";
import { getProjectPages } from "../../ipc/project";
import { proxyLocalImage } from "../../ipc/image";
import { Type, Check, FileText, Layers, Image as ImageIcon } from "lucide-react";
import ProgressBar from "../ProgressBar";
import NatureButton from "../NatureButton";

type VerticalStatusCardProps = {
  project: Project;
};

export default function VerticalStatusCard({ project }: VerticalStatusCardProps) {
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

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

  return (
    <>
      <div className="vsc-image-container">
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
        </div>
      </div>
      <div className="vsc-export-wrap">
        <div className="vsc-export-inner">
          <NatureButton
            variant="cloud"
            minWidth={0}
            onClick={() => {
              console.log("[VerticalStatusCard] Export", project.id);
            }}
          >导出</NatureButton>
        </div>
      </div>
    </>
  );
}
