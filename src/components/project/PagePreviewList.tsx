import "./PagePreviewList.css";
import { useEffect, useState } from "react";
import { Page } from "../../models/project";
import { getProjectPages } from "../../ipc/project";
import PagePreviewCard from "./PagePreviewCard";
import NatureButton from "../NatureButton";
import DotLoadSpinner from "../DotLoadSpinner";
import { ArrowLeft } from "lucide-react";

type PagePreviewListProps = {
  projectId: string;
  onBack: () => void;
  onPageSelect: (pageIndex: number) => void;
};

export default function PagePreviewList({
  projectId,
  onBack,
  onPageSelect,
}: PagePreviewListProps) {
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    getProjectPages(projectId)
      .then((data) => {
        if (isMounted) setPages(data);
      })
      .catch(console.error)
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [projectId]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100%",
          minHeight: 200,
          flexDirection: "column",
          gap: 10,
        }}
      >
        <DotLoadSpinner />
        <div style={{ color: "#9ca3af", fontSize: 13 }}>加载中</div>
      </div>
    );
  }

  return (
    <div className="ppl-container">
      <div className="ppl-header">
        <NatureButton
          variant="cloud"
          fontSize={12}
          minWidth={60}
          onClick={onBack}
        >
          <ArrowLeft size={14} /> 返回
        </NatureButton>
        <div className="ppl-title">页面预览 ({pages.length})</div>
      </div>
      <div className="ppl-list">
        {pages.map((p, i) => (
          <PagePreviewCard
            key={p.id}
            page={p}
            index={i}
            onClick={(pageIndex) => onPageSelect(pageIndex)}
          />
        ))}
      </div>
    </div>
  );
}
