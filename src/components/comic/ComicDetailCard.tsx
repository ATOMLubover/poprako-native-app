import { useState, useMemo, useEffect } from "react";
import { UserPlus, LogOut, Download, Edit3, CheckCircle, Save, Trash2, FileText, Layers, Type, Check } from "lucide-react";
import InPanelIcon from "../InPanelIcon";
import OutPanelIcon from "../OutPanelIcon";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import NatureButton from "../NatureButton";
import NatureTag from "../NatureTag";
import type { ComicInfo } from "../../models/comic/comic";
import type { AssignmentBrief } from "../../models/comic/assignment";
import type { Tag } from "../../models/tag";
import { getLocalImage } from "../../store/image";
import "./ComicDetailCard.css";

type Props = {
  comic: ComicInfo;
  /** mock: id of current user (will come from store later) */
  currentUserId?: string;
};

type RoleStats = {
  translators: AssignmentBrief[];
  proofreaders: AssignmentBrief[];
  typesetters: AssignmentBrief[];
  reviewers: AssignmentBrief[];
};

type UnitStats = {
  units: number;
  translated: number;
  proofed: number;
  inbox: number;
  outbox: number;
};

type ProgressStatus = "pending" | "in-progress" | "completed";

type RoleRowProps = {
  label: string;
  users: AssignmentBrief[];
  status: ProgressStatus;
  currentUserId?: string;
};

function RoleRow({ label, users, status, currentUserId }: RoleRowProps) {
  const hasUsers = users.length > 0;
  const isCurrentUserInRole = (users || []).some((u) => u.userId === currentUserId);
  let bgColor = "transparent";
  let textColor = "#a8a29e";
  let dotColor = "#e7e5e4";

  if (hasUsers) {
    if (status === "completed") {
      bgColor = "rgba(43,106,69,0.10)";
      textColor = "#1f5337";
      dotColor = "#2b6a45";
    } else if (status === "in-progress") {
      bgColor = "rgba(160,100,40,0.10)";
      textColor = "#7f4519";
      dotColor = "#a06428";
    } else {
      bgColor = "transparent";
      textColor = "#4b3f33";
      dotColor = "#605445";
    }
  }

  return (
    <div className={`role-row ${isCurrentUserInRole ? "interactive" : ""}`} style={{ backgroundColor: bgColor }}>
      <div className="role-dot" style={{ backgroundColor: dotColor }} />
      <span className="role-label">{label}：</span>
      <span className="role-users" style={{ color: textColor }}>
        {hasUsers ? users.map((u) => u.userNickname).join("、") : "未指派"}
      </span>
    </div>
  );
}

type CompactStatProps = {
  label: string;
  value: number;
  icon: React.ReactNode;
};

function CompactStat({ label, value, icon }: CompactStatProps) {
  return (
    <div className="compact-stat">
      <div className="stat-title">
        {icon}
        <span>{label}</span>
      </div>
      <div className="stat-value">{value}</div>
    </div>
  );
}

export default function ComicDetailCard({ comic, currentUserId }: Props) {
  const [activeTab, setActiveTab] = useState<"chart" | "preview">("preview");
  const [visibleCount, setVisibleCount] = useState<number>(4);

  // 小组件：负责从 store 加载本地图片并返回可用于 <img> 的 src（objectUrl）
  function PageThumb({ srcPath, alt }: { srcPath: string; alt?: string }) {
    const [src, setSrc] = useState<string | null>(null);

    useEffect(() => {
      let mounted = true;

      async function load() {
        try {
          // 使用 store 的 getLocalImage 代理读取本地图片（返回 objectUrl + blob）
          const res = await getLocalImage(srcPath);
          if (mounted && res && res.objectUrl) {
            setSrc(res.objectUrl);
            return;
          }
        } catch (e) {
          // 忽略，尝试直接使用原始路径（在某些运行环境下可能是 data: 或 http(s)）
        }

        if (mounted) {
          setSrc(srcPath);
        }
      }

      load();

      return () => {
        mounted = false;
      };
    }, [srcPath]);

    return (
      <div className="preview-item">
        {src ? <img src={src} alt={alt ?? "preview"} /> : <div className="cover-placeholder">加载中</div>}
        <div className="preview-overlay" />
      </div>
    );
  }

  // 封面图片源：运行时加载（优先使用 coverImageUrl，否则使用第一页的 imageUrl）
  const [coverSrc, setCoverSrc] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadCover() {
      try {
        // prefer explicit coverImageUrl if provided, otherwise use first page imageUrl
        const path = comic.coverImageUrl ?? (comic.pages.length > 0 ? comic.pages[0].imageUrl : undefined);
        if (!path) return;

        try {
          const res = await getLocalImage(path);
          if (mounted && res && res.objectUrl) {
            setCoverSrc(res.objectUrl);
            return;
          }
        } catch (e) {
          // fall back to using the raw path
        }

        if (mounted) {
          setCoverSrc(path);
        }
      } catch (e) {
        console.error("Failed to load cover image", e);
      }
    }

    loadCover();

    return () => {
      mounted = false;
    };
  }, [comic.coverImageUrl, comic.pages]);

  // 模拟当前用户 id（真实场景由 store 提供）
  const mockCurrentUserId = "user-001";
  const effectiveCurrentUserId = currentUserId ?? mockCurrentUserId;
  // 基于 userId 的权限检查，当前为 mock：判断是否被指派为监修
  const isReviewer = (() => {
    return comic.assignments.some((a) => a.userId === effectiveCurrentUserId && !!a.assignedReviewerAt);
  })();

  const calculateProgressStatus = (
    startedAt?: Date,
    completedAt?: Date
  ): ProgressStatus => {
    if (completedAt) return "completed";
    if (startedAt) return "in-progress";
    return "pending";
  };

  const rolesData: RoleStats = useMemo(
    () => ({
      translators: comic.assignments.filter((a) => a.assignedTranslatorAt),
      proofreaders: comic.assignments.filter((a) => a.assignedProofreaderAt),
      typesetters: [
        ...comic.assignments.filter((a) => a.assignedTypesetterAt),
        ...comic.assignments.filter((a) => a.assignedRedrawerAt).map((a) => ({
          ...a,
          userNickname: `${a.userNickname}(美工)`,
        })),
      ],
      reviewers: comic.assignments.filter((a) => a.assignedReviewerAt),
    }),
    [comic.assignments]
  );

  const stats: UnitStats = useMemo(() => {
    return comic.pages.reduce(
      (acc, p) => ({
        units: acc.units + p.unitCount,
        translated: acc.translated + p.translatedCount,
        proofed: acc.proofed + p.proovedCount,
        inbox: acc.inbox + p.inboxCount,
        outbox: acc.outbox + p.outboxCount,
      }),
      { units: 0, translated: 0, proofed: 0, inbox: 0, outbox: 0 }
    );
  }, [comic.pages]);

  const isUserInProject = comic.assignments.some((a) => a.userId === effectiveCurrentUserId);

  const chartData = comic.pages.map((p) => ({
    p: `P${p.index}`,
    inbox: p.inboxCount,
    outbox: p.outboxCount,
  }));

  

  return (
    <div className="comic-detail-card">
      {/* 左侧栏 */}
      <div className="left-sidebar">
        <div className="cover-image">
          {coverSrc ? (
            <img src={coverSrc} alt="Cover" />
          ) : (
            <div className="cover-placeholder">暂无封面</div>
          )}
        </div>

        <div className="sidebar-title">
          <div className="title-index">[{comic.collectionIndex}-{comic.index}]</div>
          <div className="title-content">
            <span className="title-author">【{comic.author}】</span>
            <span className="title-text">{comic.title}</span>
          </div>

          <div className="sidebar-tags">
            {comic.tags.map((t) => (
              <NatureTag key={t.tagId} tag={t as Tag} theme="theme-glacier" fontSize={11} />
            ))}
          </div>
        </div>

        <div className="sidebar-actions">
          {/* 仅在未加入时显示加入按钮，退出将放到底部 */}
          {!isUserInProject && (
            <NatureButton
              variant="clay"
              minWidth="100%"
              fontSize={11}
              onClick={() => console.log("加入项目")}
            >
              <UserPlus size={12} style={{ marginRight: 4 }} />
              加入项目
            </NatureButton>
          )}

          <div className="action-row">
            <NatureButton variant="cloud" minWidth="100%" fontSize={10} onClick={() => console.log("导出")}>
              <Download size={11} style={{ marginRight: 6 }} />
              导出
            </NatureButton>

            {isReviewer && (
              <NatureButton variant="cloud" minWidth="100%" fontSize={10} onClick={() => console.log("修改")}>
                <Edit3 size={11} style={{ marginRight: 6 }} />
                修改
              </NatureButton>
            )}

            {/* 缓存按钮：仅译者或校对可见；当前 mock 权限始终返回 true，onClick 留空 */}
            {true && (
              <NatureButton variant="cloud" minWidth="100%" fontSize={10} onClick={() => {}}>
                <Save size={11} style={{ marginRight: 6 }} />
                缓存
              </NatureButton>
            )}
          </div>

          <div className="final-actions">
            {isUserInProject && (
              <button className="final-action-btn exit-btn" onClick={() => console.log("退出项目")}>
                <LogOut size={11} />
                退出项目
              </button>
            )}

            {isReviewer && (
              <>
                <button className="final-action-btn complete-btn">
                  <CheckCircle size={11} />
                  完结项目
                </button>
                <button className="final-action-btn delete-btn">
                  <Trash2 size={11} />
                  删除项目
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 右侧内容 */}
      <div className="right-content">
        {/* 分配与统计 */}
        <div className="assignments-stats-section">
          <div className="roles-column">
            <RoleRow label="翻译" users={rolesData.translators} status={calculateProgressStatus(comic.translationStartedAt, comic.translationCompletedAt)} currentUserId={effectiveCurrentUserId} />
            <RoleRow label="校对" users={rolesData.proofreaders} status={calculateProgressStatus(comic.proofreadingStartedAt, comic.proofreadingCompletedAt)} currentUserId={effectiveCurrentUserId} />
            <RoleRow label="嵌字" users={rolesData.typesetters} status={calculateProgressStatus(comic.typesettingStartedAt, comic.typesettingCompletedAt)} currentUserId={effectiveCurrentUserId} />
            <RoleRow label="监修" users={rolesData.reviewers} status={comic.reviewedAt ? "completed" : "pending"} currentUserId={effectiveCurrentUserId} />
          </div>
          <div className="column-divider" />
          <div className="stats-column">
            <CompactStat label="总页数" value={comic.pageCount} icon={<FileText size={16} />} />
            <CompactStat label="总单元" value={stats.units} icon={<Layers size={16} />} />
            <CompactStat label="已翻译" value={stats.translated} icon={<Type size={16} />} />
            <CompactStat label="已校对" value={stats.proofed} icon={<Check size={16} />} />
            <CompactStat label="框外" value={stats.outbox} icon={<OutPanelIcon size={20} />} />
            <CompactStat label="框内" value={stats.inbox} icon={<InPanelIcon size={20} />} />
          </div>
        </div>

        {/* 可视化区域 */}
        <div className="visualization-area">
          <div className="visualization-header">
            <div className="visualization-left">
              

              <div className="tab-switcher">
                <button
                  className={`tab-btn ${activeTab === "preview" ? "active" : ""}`}
                  onClick={() => setActiveTab("preview")}
                >
                  预览
                </button>
                <button
                  className={`tab-btn ${activeTab === "chart" ? "active" : ""}`}
                  onClick={() => setActiveTab("chart")}
                >
                  图表
                </button>

              </div>
            </div>

            <div className="visualization-right">
              {activeTab === "preview" && (
                <NatureButton variant="cloud" fontSize={11} onClick={() => setVisibleCount((v) => Math.min(comic.pages.length, v + 4))}>
                  加载更多
                </NatureButton>
              )}
            </div>
          </div>

          <div className="visualization-content">
            {activeTab === "chart" ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="2 2" vertical={false} stroke="#f3f3f2" />
                  <XAxis dataKey="p" axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: "#d6d3d1" }} interval={2} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 8, fill: "#d6d3d1" }} />
                  <RechartsTooltip
                    contentStyle={{
                      fontSize: "10px",
                      borderRadius: "8px",
                      border: "1px solid #f5f5f4",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.03)",
                    }}
                    itemStyle={{ padding: "0 2px" }}
                  />
                  <Area
                    name="框内"
                    type="monotone"
                    dataKey="inbox"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.08}
                    strokeWidth={2}
                    dot={{ r: 1 }}
                  />
                  <Area
                    name="框外"
                    type="monotone"
                    dataKey="outbox"
                    stroke="#f59e0b"
                    fill="#f59e0b"
                    fillOpacity={0.08}
                    strokeWidth={2}
                    dot={{ r: 1 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="preview-grid">
                {comic.pages.slice(0, visibleCount).map((page) => (
                  <PageThumb key={page.id} srcPath={page.imageUrl} alt={`P${page.index}`} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
