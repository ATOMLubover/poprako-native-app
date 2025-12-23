import { useEffect, useState, useRef } from "react";
import NatureButton from "./NatureButton";
import NatureSwitchButton from "./NatureSwitchButton";
import Icon from "./Icon";
import ComicSelector from "./ComicSelector";
import TeamSelector from "./TeamSelector.tsx";
import "./TermbaseCreator.css";
import type { NewTermbase } from "../models/term";

type Props = {
  initial?: Partial<NewTermbase>;
  onSave?: (payload: NewTermbase) => void;
  onCancel?: () => void;
};

/**
 * 术语库创建卡片
 * 简洁图标驱动，操作流程符合人体工学
 */
export default function TermbaseCreator({
  initial = {},
  onSave,
  onCancel,
}: Props) {
  // 容器引用：用于计算弹出层最大宽度（不超过创建卡片的 95%）
  const rootRef = useRef<HTMLDivElement | null>(null);

  // 弹出卡片最大宽度（像素），根据 rootRef 实时计算
  const [name, setName] = useState<string>(initial.name ?? "");
  const [teamId, setTeamId] = useState<string>(initial.teamId ?? "");
  const [description, setDescription] = useState<string>(initial.description ?? "");
  const [isPrivate, setIsPrivate] = useState<boolean>(initial.isPrivate ?? false);
  const [relatedComicId, setRelatedComicId] = useState<string | undefined>(initial.relatedComicId);
  const [saving, setSaving] = useState<boolean>(false);

  const teams = [
    { teamId: "t1", name: "A" },
    { teamId: "t2", name: "汉化组" },
    { teamId: "t3", name: "非常长的汉化组名称组织机构" },
  ];

  const [showComicSelector, setShowComicSelector] = useState(false);
  const [showTeamSelector, setShowTeamSelector] = useState(false);
  const teamModalRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setName(initial.name ?? "");
    setTeamId(initial.teamId ?? (teams && teams.length ? teams[0].teamId : ""));
    setDescription(initial.description ?? "");
    setIsPrivate(initial.isPrivate ?? false);
    setRelatedComicId(initial.relatedComicId);
  }, [initial]);

  

  // Log DOM sizes when team selector opens to help debug clipping
  useEffect(() => {
    if (!showTeamSelector) return;

    const t = window.setTimeout(() => {
      try {
        console.groupCollapsed("TermbaseCreator Debug: TeamSelector opened");
        const root = rootRef.current;
        console.debug("rootRef:", root || "<no root>");
        if (root) {
          console.debug("root offsetWidth", root.offsetWidth, "clientWidth", root.clientWidth);
          console.debug("root boundingClientRect", root.getBoundingClientRect());
        }

        const modal = teamModalRef.current;
        console.debug("team modal element:", modal || "<no modal>");
        if (modal) {
          console.debug("modal offsetWidth", modal.offsetWidth, "clientWidth", modal.clientWidth);
          console.debug("modal boundingClientRect", modal.getBoundingClientRect());

          // walk up parent chain and log sizes
          let el: HTMLElement | null = modal as HTMLElement;
          const chain: Array<string> = [];
          while (el) {
            const cls = el.className || "";
            chain.push(`${el.tagName.toLowerCase()} ${cls} -> w:${el.offsetWidth}`);
            el = el.parentElement;
          }
          console.debug("parent chain:", chain.join(" | "));
        }

        console.groupEnd();
      } catch (e) {
        console.error("Debug log failed", e);
      }
    }, 120);

    return () => clearTimeout(t);
  }, [showTeamSelector]);

  function handleSave() {
    setSaving(true);

    setTimeout(() => {
      setSaving(false);

      const payload: NewTermbase = {
        name,
        teamId,
        description,
        isPrivate,
        relatedComicId,
      };

      if (onSave) {
        onSave(payload);
      }
    }, 700);
  }

  return (
    <div className="termbase-creator-card" ref={rootRef}>
      {showTeamSelector ? (
        <div className="tbc-selector-full">
          <div className="tbc-selector-content">
            <TeamSelector
              teams={teams}
              onSelect={(selectedId: string) => {
                setTeamId(selectedId);
                setShowTeamSelector(false);
              }}
              onExit={() => setShowTeamSelector(false)}
            />
          </div>
        </div>
      ) : showComicSelector ? (
        <div className="tbc-selector-full">
          <div className="tbc-selector-content">
            <ComicSelector
              onSelect={(c) => {
                setRelatedComicId(c.id);
                setShowComicSelector(false);
              }}
              onExit={() => setShowComicSelector(false)}
            />
          </div>
        </div>
      ) : (
        <>
          <div className="tbc-body">
            <div className="tbc-field">
              <div className="tbc-field-icon">
                <Icon name="database" size={18} />
              </div>
              <input
                className="tbc-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="术语库名称"
              />
            </div>

            <div className="tbc-field">
              <div className="tbc-field-icon">
                <Icon name="users" size={18} />
              </div>
              <div style={{ flex: 1, display: "flex", gap: 8 }}>
                <input
                  className="tbc-input tbc-preview"
                  value={(teams.find((t) => t.teamId === teamId) || { name: "" }).name}
                  readOnly
                  placeholder="未选择汉化组，必选"
                />
                <NatureButton variant="mist" onClick={() => setShowTeamSelector(true)} minWidth={70}>
                  选择
                </NatureButton>
              </div>
            </div>

            <div className="tbc-field">
              <div className="tbc-field-icon">
                <Icon name="image" size={18} />
              </div>
              <div style={{ flex: 1, display: "flex", gap: 8 }}>
                <input
                  className="tbc-input tbc-preview"
                  value={relatedComicId ?? ""}
                  readOnly
                  placeholder="未选择相关漫画，可不选"
                />
                <NatureButton variant="mist" onClick={() => setShowComicSelector(true)} minWidth={70}>
                  选择
                </NatureButton>
              </div>
            </div>

            <div className="tbc-field">
              <div className="tbc-field-icon">
                <Icon name="pencil" size={18} />
              </div>
              <textarea
                className="tbc-textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="描述"
              />
            </div>

            <div style={{ height: 8 }} />

            <div className="tbc-field" style={{ gap: 4, alignItems: "center" }}>
              <div className="tbc-field-icon">
                <Icon name="layers" size={18} />
              </div>
              <div>
                <NatureSwitchButton
                  initialState={isPrivate ? "on" : "off"}
                  onToggle={(s) => setIsPrivate(s === "on")}
                  width={140}
                  height={34}
                  onText="私有"
                  offText="私有"
                />
              </div>
            </div>
          </div>

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
        </>
      )}
    </div>
  );
}
