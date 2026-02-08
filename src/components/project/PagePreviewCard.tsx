import "./PagePreviewList.css";
import { useEffect, useRef, useState } from "react";
import { Page } from "../../models/project";
import { proxyLocalImage } from "../../ipc/image";
import { getPageUnits } from "../../ipc/project/unit";
import ProgressBar from "../ProgressBar";

type PagePreviewCardProps = {
  page: Page;
  index: number;
  onClick: (pageIndex: number, page: Page) => void;
};

export default function PagePreviewCard({
  page,
  index,
  onClick,
}: PagePreviewCardProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [translatedCount, setTranslatedCount] = useState(0);
  const [proovedCount, setProovedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "100px" },
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let isMounted = true;

    if (isVisible && page.localImageUrl) {
      proxyLocalImage(page.localImageUrl)
        .then((url) => {
          if (isMounted) setSrc(url);
        })
        .catch(console.error);
    }

    return () => {
      isMounted = false;
    };
  }, [isVisible, page.localImageUrl]);

  useEffect(() => {
    let isMounted = true;

    if (isVisible) {
      getPageUnits(page.id)
        .then((units) => {
          if (!isMounted) return;

          const total = units.length;
          const translated = units.filter(
            (u) => u.translatedText && u.translatedText.trim() !== "",
          ).length;
          const prooved = units.filter((u) => u.isProoved).length;

          setTotalCount(total);
          setTranslatedCount(translated);
          setProovedCount(prooved);
        })
        .catch(console.error);
    }

    return () => {
      isMounted = false;
    };
  }, [isVisible, page.id]);

  const trPercent = totalCount > 0 ? (translatedCount / totalCount) * 100 : 0;
  const prPercent = totalCount > 0 ? (proovedCount / totalCount) * 100 : 0;

  const tr = Math.max(0, Math.min(100, Math.round(trPercent)));
  const pr = Math.max(0, Math.min(100, Math.round(prPercent)));

  return (
    <div
      className="ppc-card"
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={() => onClick(index, page)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick(index, page);
        }
      }}
    >
      <div className="ppc-image-wrap">
        {src ? (
          <img
            src={src}
            alt={`Page ${index + 1}`}
            className="ppc-image loaded"
          />
        ) : (
          <div className="ppc-placeholder">P{index + 1}</div>
        )}
      </div>
      <div className="ppc-index-badge">{index + 1}P</div>
      <div className="ppc-progress">
        <ProgressBar
          items={[
            { color: "#fed7aa", length: tr },
            { color: "#bbf7d0", length: pr },
          ]}
          height={6}
        />
      </div>
    </div>
  );
}
