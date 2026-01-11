import { useState, useEffect, type KeyboardEvent } from "react";
import "./ComicCreator.css";
import NatureButton from "./NatureButton";
import NatureTag from "./NatureTag";
import Icon from "./Icon";
import { useToast } from "./NotificationToast";
import MemberSelector from "./MemberSelector";
import TagSelector from "./TagSelector";
import { getAppState } from "../store/app";
import type { NewComic } from "../models/comic/comic";
import type { NewAssignment } from "../models/comic/assignment";
import type { MemberBrief } from "../models/member";
import type { TagBrief } from "../models/tag";

type ComicCreatorProps = {
  onClose?: () => void;
};

type RightPanelMode =
  | "NONE"
  | "TAGS"
  | "ASSIGN_TRANS"
  | "ASSIGN_PROOF"
  | "ASSIGN_TYPE"
  | "ASSIGN_ART"
  | "ASSIGN_REVIEW"
  | "DESC";

type AssignmentMap = {
  translator: MemberBrief[];
  proofreader: MemberBrief[];
  typesetter: MemberBrief[];
  redrawer: MemberBrief[];
  reviewer: MemberBrief[];
};

export default function ComicCreator({ onClose }: ComicCreatorProps) {
  const { showToast } = useToast();
  const appState = getAppState();
  const currentUser = appState.currentUser;

  // 表单状态
  const [collectionId, setCollectionId] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [author, setAuthor] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [selectedTags, setSelectedTags] = useState<TagBrief[]>([]);

  // 任务分配状态（每个职位允许多个人）
  const [assignments, setAssignments] = useState<AssignmentMap>({
    translator: [],
    proofreader: [],
    typesetter: [],
    redrawer: [],
    reviewer: [],
  });

  const [panelMode, setPanelMode] = useState<RightPanelMode>("NONE");

  // 将创建者初始化为监修（作为首个监修成员）
  useEffect(() => {
    if (currentUser) {
      setAssignments((prev) => ({
        ...prev,
        reviewer: [
          {
            memberId: currentUser.memberId,
            nickname: currentUser.nickname,
            tags: currentUser.tags,
          },
        ],
      }));
    }
  }, [currentUser]);

  // 初始化集合（如果有）
  useEffect(() => {
    if (appState.collectionIds.length > 0 && !collectionId) {
      setCollectionId(appState.collectionIds[0]);
    }
  }, [appState.collectionIds, collectionId]);

  // --- Handlers ---

  const handleAddTag = (tag: TagBrief) => {
    if (selectedTags.find((t) => t.tagId === tag.tagId)) {
      return;
    }
    if (selectedTags.length >= 3) {
      showToast("info", "最多只允许添加三个标签");
      return;
    }
    setSelectedTags([...selectedTags, tag]);
  };

  const handleRemoveTag = (tagId: string) => {
    setSelectedTags(selectedTags.filter((t) => t.tagId !== tagId));
  };

  const handleAssignMember = (member: MemberBrief) => {
    let roleKey: keyof AssignmentMap | null = null;
    switch (panelMode) {
      case "ASSIGN_TRANS":
        roleKey = "translator";
        break;
      case "ASSIGN_PROOF":
        roleKey = "proofreader";
        break;
      case "ASSIGN_TYPE":
        roleKey = "typesetter";
        break;
      case "ASSIGN_ART":
        roleKey = "redrawer";
        break;
      case "ASSIGN_REVIEW":
        roleKey = "reviewer";
        break;
      default:
        break;
    }

    if (roleKey) {
      setAssignments((prev) => {
        const existing = prev[roleKey] || [];
        if (existing.find((m) => m.memberId === member.memberId)) {
          return prev;
        }
        return { ...prev, [roleKey]: [...existing, member] };
      });
    }
  };

  const handleSubmit = async () => {
    // 校验
    const errors: string[] = [];
    if (!collectionId) errors.push("请选择所属 Collection");
    if (!title.trim()) errors.push("请输入标题");
    if (!author.trim()) errors.push("请输入作者");
    if (selectedTags.length === 0) errors.push("请至少选择一个标签");

    if (errors.length > 0) {
      showToast("error", errors[0]);
      return;
    }

    // 构建 DTO
    // 将 assignments map 转换为 NewAssignment[]
    const preAssignments: NewAssignment[] = [];

    // 用户 ID -> 角色映射
    const userRoles = new Map<
      string,
      {
        member: MemberBrief;
        roles: Set<string>;
      }
    >();

    const addRole = (
      key: keyof AssignmentMap,
      roleProp: keyof NewAssignment
    ) => {
      const members = assignments[key];
      members.forEach((member) => {
        if (!userRoles.has(member.memberId)) {
          userRoles.set(member.memberId, { member, roles: new Set() });
        }
        userRoles.get(member.memberId)!.roles.add(roleProp as string);
      });
    };

    addRole("translator", "assignTranslator");
    addRole("proofreader", "assignProofreader");
    addRole("typesetter", "assignTypesetter");
    addRole("redrawer", "assignRedrawer");
    addRole("reviewer", "assignReviewer");

    userRoles.forEach((entry, userId) => {
      const newAssign: NewAssignment = {
        comicId: "", // Backend handles? Or ignored.
        userId: userId,
        assignTranslator: entry.roles.has("assignTranslator"),
        assignProofreader: entry.roles.has("assignProofreader"),
        assignTypesetter: entry.roles.has("assignTypesetter"),
        assignRedrawer: entry.roles.has("assignRedrawer"),
        assignReviewer: entry.roles.has("assignReviewer"),
      };
      preAssignments.push(newAssign);
    });

    const newComic: NewComic = {
      collectionId,
      title,
      author,
      description,
      tagIds: selectedTags.map((t) => t.tagId),
      preAssignments,
    };

    console.log("Submitting NewComic:", newComic);

    try {
      // await ipcCreateComic(newComic);
      await new Promise((r) => setTimeout(r, 800)); // Mock
      showToast("success", `漫画 "${title}" 已创建`);
      onClose?.();
    } catch (err) {
      showToast("error", "IPC 调用异常");
    }
  };

  // --- Render Helpers ---

  const handleRemoveMember = (role: keyof AssignmentMap, memberId: string) => {
    // 监修角色：不允许删除当前用户
    if (role === "reviewer" && memberId === currentUser?.memberId) {
      return;
    }
    setAssignments((prev) => ({
      ...prev,
      [role]: prev[role].filter((m) => m.memberId !== memberId),
    }));
  };

  const renderAssignRow = (
    label: string,
    role: keyof AssignmentMap,
    mode: RightPanelMode
  ) => {
    const members = assignments[role];
    const isEditing = panelMode === mode;

    return (
      <div className="cc-assignment-row">
        <span className="cc-role-label">{label}</span>
        <div className="cc-assignee">
          {members.length > 0 ? (
            members.map((member) => {
              const isReviewer = role === "reviewer";
              const canRemove =
                !isReviewer || member.memberId !== currentUser?.memberId;
              const displayName =
                member.nickname && member.nickname.length > 4
                  ? member.nickname.slice(0, 4) + "..."
                  : member.nickname;
              const title = `${member.nickname}${
                canRemove ? " · 点击移除" : " · 不可移除当前用户"
              }`;
              return (
                <span
                  key={member.memberId}
                  className="cc-assignee-tag"
                  onClick={() =>
                    canRemove && handleRemoveMember(role, member.memberId)
                  }
                  title={title}
                  style={{
                    cursor: canRemove ? "pointer" : "default",
                    opacity: canRemove ? 1 : 0.7,
                    marginRight: 6,
                  }}
                >
                  {displayName}
                  {canRemove && <span className="cc-assignee-remove">×</span>}
                </span>
              );
            })
          ) : (
            <span className="cc-assign-placeholder">未分配</span>
          )}
        </div>
        <NatureButton
          variant={isEditing ? "mist" : "cloud"}
          onClick={() => setPanelMode(isEditing ? "NONE" : mode)}
          fontSize={12}
          minWidth={50}
        >
          {members.length > 0 ? "更改" : "选择"}
        </NatureButton>
      </div>
    );
  };

  return (
    <div className="comic-creator-container">
      <div className="cc-main">
        {/* LEFT PANEL */}
        <div className="cc-left">
          <div className="cc-field">
            <div className="cc-field-icon">
              <Icon name="database" size={16} />
            </div>
            <select
              className="cc-input cc-select cc-select-inline"
              value={collectionId}
              onChange={(e) => setCollectionId(e.target.value)}
            >
              <option value="" disabled>
                选择作品集
              </option>
              {appState.collectionIds.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
              {appState.collectionIds.length === 0 && (
                <option value="demo_col">默认演示集合 (Demo)</option>
              )}
            </select>
          </div>

          <div className="cc-field">
            <div className="cc-field-icon">
              <Icon name="pencil" size={16} />
            </div>
            <input
              className="cc-input cc-input-inline"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="标题"
            />
          </div>

          <div className="cc-field">
            <div className="cc-field-icon">
              <Icon name="type" size={16} />
            </div>
            <input
              className="cc-input cc-input-inline"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="作者"
            />
          </div>

          <div className="cc-field">
            <div className="cc-field-icon">
              <Icon name="message" size={16} />
            </div>
            <input
              className="cc-input cc-input-inline"
              value={description}
              onClick={() => setPanelMode("DESC")}
              readOnly
              placeholder="在右侧编辑简介"
              style={{ cursor: "pointer" }}
            />
          </div>

          <div className="cc-field">
            <div className="cc-field-icon">
              <Icon name="tag" size={16} />
            </div>
            <div className="cc-tags-container">
              {selectedTags.map((tag) => (
                <NatureTag
                  key={tag.tagId}
                  tag={{ ...tag, isPinned: false, likedNum: 0 } as any}
                  onClick={() => handleRemoveTag(tag.tagId)}
                  theme="theme-mist"
                  fontSize={12}
                />
              ))}
            </div>
            <button
              className="cc-add-tag-btn"
              onClick={() =>
                setPanelMode(panelMode === "TAGS" ? "NONE" : "TAGS")
              }
              title="添加标签"
            >
              +
            </button>
          </div>

          <div className="cc-field" style={{ marginBottom: 2 }}>
            <div className="cc-field-icon">
              <Icon name="users" size={16} />
            </div>
            <div style={{ flex: 1, fontSize: 13, color: "#64748b" }}>
              人员分配
            </div>
          </div>
          <div className="cc-assignments-list">
            {renderAssignRow("翻译", "translator", "ASSIGN_TRANS")}
            {renderAssignRow("校对", "proofreader", "ASSIGN_PROOF")}
            {renderAssignRow("嵌字", "typesetter", "ASSIGN_TYPE")}
            {renderAssignRow("美工", "redrawer", "ASSIGN_ART")}
            {renderAssignRow("监修", "reviewer", "ASSIGN_REVIEW")}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="cc-right">
          <div className="selector-scrollable">
            {panelMode === "NONE" && (
              <div className="cc-empty-right">
                <p>
                  在左侧点击“选择"
                  <br />
                  以在此处显示选择器
                </p>
              </div>
            )}

            {panelMode === "TAGS" && (
              <TagSelector
                onSelect={handleAddTag}
                onExit={() => setPanelMode("NONE")}
                placeholder="搜索标签..."
              />
            )}

            {panelMode === "DESC" && (
              <div
                style={{
                  padding: 8,
                  display: "flex",
                  flexDirection: "column",
                  height: "100%",
                }}
              >
                <textarea
                  className="cc-textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onKeyDown={(e: KeyboardEvent<HTMLTextAreaElement>) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      setPanelMode("NONE");
                    }
                  }}
                  placeholder="在此输入漫画简介... (按 Enter 保存, Shift+Enter 换行)"
                  style={{ flex: 1, minHeight: 0, resize: "none" }}
                />
              </div>
            )}

            {(panelMode === "ASSIGN_TRANS" ||
              panelMode === "ASSIGN_PROOF" ||
              panelMode === "ASSIGN_TYPE" ||
              panelMode === "ASSIGN_ART" ||
              panelMode === "ASSIGN_REVIEW") && (
              <MemberSelector
                teamId={appState.currentTeamId}
                onSelect={handleAssignMember}
                onExit={() => setPanelMode("NONE")}
                placeholder="搜索成员..."
              />
            )}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="cc-footer">
        <NatureButton variant="mist" onClick={onClose} minWidth={100}>
          取消
        </NatureButton>
        <NatureButton variant="mist" onClick={handleSubmit} minWidth={100}>
          确认创建
        </NatureButton>
      </div>
    </div>
  );
}
