import { useState, useEffect, type KeyboardEvent } from "react";
import "./ComicModifier.css";
import NatureButton from "../NatureButton";
import Icon from "../Icon";
import { useToast } from "../NotificationToast";
import UserSelector from "../UserSelector";
import { getAppState } from "../../store/app";
import type { UserBrief } from "../../models/user";

type ComicModifierProps = {
  comicId: string;
  onClose?: () => void;
  onUpdate?: (payload: any) => Promise<void> | void;
};

type RightPanelMode =
  | "NONE"
  | "DESC"
  | "ASSIGN_TRANS"
  | "ASSIGN_PROOF"
  | "ASSIGN_TYPE"
  | "ASSIGN_ART"
  | "ASSIGN_REVIEW"
  | "UPLOAD_LIST";

type AssignmentMap = {
  translator: UserBrief[];
  proofreader: UserBrief[];
  typesetter: UserBrief[];
  redrawer: UserBrief[];
  reviewer: UserBrief[];
};

type UploadTaskStatus = "pending" | "uploading" | "completed" | "failed";

interface UploadTask {
  id: string;
  fileName: string;
  filePath: string;
  status: UploadTaskStatus;
  errorMessage?: string;
}

export default function ComicModifier({
  comicId,
  onClose,
  onUpdate,
}: ComicModifierProps) {
  const { showToast } = useToast();
  const appState = getAppState();
  const currentUser = appState.currentUser;

  // 表单状态
  const [loading, setLoading] = useState<boolean>(true);
  const [collectionId, setCollectionId] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [author, setAuthor] = useState<string>("");
  const [description, setDescription] = useState<string>("");

  // 任务分配状态
  const [assignments, setAssignments] = useState<AssignmentMap>({
    translator: [],
    proofreader: [],
    typesetter: [],
    redrawer: [],
    reviewer: [],
  });

  // 上传任务
  const [uploadTasks, setUploadTasks] = useState<UploadTask[]>([]);

  const [panelMode, setPanelMode] = useState<RightPanelMode>("NONE");

  // 初始化，加载漫画数据（Mock）
  useEffect(() => {
    async function loadComic() {
      setLoading(true);

      // Mock 延迟
      await new Promise((r) => setTimeout(r, 600));

      // Mock 数据
      setCollectionId("demo_col");
      setTitle("示例漫画标题");
      setAuthor("示例作者");
      setDescription("这是一个示例漫画的简介。");

      setAssignments({
        translator: [
          { id: "user-1", nickname: "译者A" },
          { id: "user-2", nickname: "译者B" },
        ],
        proofreader: [{ id: "user-3", nickname: "校对C" }],
        typesetter: [],
        redrawer: [],
        reviewer: currentUser
          ? [{ id: currentUser.id, nickname: currentUser.nickname }]
          : [],
      });

      setLoading(false);
    }

    loadComic();
  }, [comicId, currentUser]);

  // --- Handlers ---

  const handleAssignMember = (member: UserBrief) => {
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
        if (existing.find((m) => m.id === member.id)) {
          return prev;
        }
        return { ...prev, [roleKey]: [...existing, member] };
      });
    }
  };

  const handleRemoveMember = (role: keyof AssignmentMap, memberId: string) => {
    // 监修角色：不允许删除当前用户
    if (role === "reviewer" && memberId === currentUser?.id) {
      return;
    }

    setAssignments((prev) => ({
      ...prev,
      [role]: prev[role].filter((m) => m.id !== memberId),
    }));
  };

  const handleSelectUpload = async () => {
    // Mock 文件选择
    const mockFiles = [
      "/path/to/page_001.jpg",
      "/path/to/page_002.jpg",
      "/path/to/page_003.jpg",
      "/path/to/page_004.jpg",
    ];

    const newTasks: UploadTask[] = mockFiles.map((path, idx) => ({
      id: `task-${Date.now()}-${idx}`,
      fileName: path.split("/").pop() || "unknown",
      filePath: path,
      status: "pending",
    }));

    setUploadTasks((prev) => [...prev, ...newTasks]);
    setPanelMode("UPLOAD_LIST");

    // Mock 上传处理
    for (const task of newTasks) {
      await new Promise((r) => setTimeout(r, 200));

      setUploadTasks((prev) =>
        prev.map((t) => (t.id === task.id ? { ...t, status: "uploading" } : t))
      );

      await new Promise((r) => setTimeout(r, Math.random() * 1000 + 500));

      const success = Math.random() > 0.2;

      setUploadTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? {
                ...t,
                status: success ? "completed" : "failed",
                errorMessage: success ? undefined : "上传失败（Mock）",
              }
            : t
        )
      );
    }
  };

  const handleRetryTask = async (taskId: string) => {
    setUploadTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: "uploading", errorMessage: undefined }
          : t
      )
    );

    await new Promise((r) => setTimeout(r, Math.random() * 1000 + 500));

    const success = Math.random() > 0.2;

    setUploadTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: success ? "completed" : "failed",
              errorMessage: success ? undefined : "重试失败（Mock）",
            }
          : t
      )
    );
  };

  const handleClearCompleted = () => {
    setUploadTasks((prev) => prev.filter((t) => t.status !== "completed"));
  };

  const handleRetryAllFailed = async () => {
    const failedTasks = uploadTasks.filter((t) => t.status === "failed");

    for (const task of failedTasks) {
      await handleRetryTask(task.id);
    }
  };

  const handleSubmit = async () => {
    // 校验
    const errors: string[] = [];
    if (!collectionId) errors.push("请选择所属 Collection");
    if (!title.trim()) errors.push("请输入标题");
    if (!author.trim()) errors.push("请输入作者");

    if (errors.length > 0) {
      showToast("error", errors[0]);
      return;
    }

    console.log("Updating comic:", {
      comicId,
      title,
      author,
      description,
      assignments,
    });

    try {
      await new Promise((r) => setTimeout(r, 800));
      showToast("success", `漫画 "${title}" 已更新`);

      if (onUpdate) {
        await onUpdate({});
      }

      onClose?.();
    } catch (err) {
      showToast("error", "更新失败");
    }
  };

  // --- Render Helpers ---

  const renderAssignRow = (
    label: string,
    role: keyof AssignmentMap,
    mode: RightPanelMode
  ) => {
    const members = assignments[role];
    const isEditing = panelMode === mode;

    return (
      <div className="cm-assignment-row">
        <span className="cm-role-label">{label}</span>
        <div className="cm-assignee">
          {members.length > 0 ? (
            members.map((member) => {
              const isReviewer = role === "reviewer";
              const canRemove = !isReviewer || member.id !== currentUser?.id;
              const displayName =
                member.nickname && member.nickname.length > 4
                  ? member.nickname.slice(0, 4) + "..."
                  : member.nickname;
              const title = `${member.nickname}${
                canRemove ? " · 点击移除" : " · 不可移除当前用户"
              }`;

              return (
                <span
                  key={member.id}
                  className="cm-assignee-tag"
                  onClick={() =>
                    canRemove && handleRemoveMember(role, member.id)
                  }
                  title={title}
                  style={{
                    cursor: canRemove ? "pointer" : "default",
                    opacity: canRemove ? 1 : 0.7,
                    marginRight: 6,
                  }}
                >
                  {displayName}
                  {canRemove && <span className="cm-assignee-remove">×</span>}
                </span>
              );
            })
          ) : (
            <span className="cm-assign-placeholder">未分配</span>
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

  const uploadStats = {
    pending: uploadTasks.filter((t) => t.status === "pending").length,
    uploading: uploadTasks.filter((t) => t.status === "uploading").length,
    completed: uploadTasks.filter((t) => t.status === "completed").length,
    failed: uploadTasks.filter((t) => t.status === "failed").length,
  };

  if (loading) {
    return (
      <div className="comic-modifier-container">
        <div className="cm-loading">加载中...</div>
      </div>
    );
  }

  return (
    <div className="comic-modifier-container">
      <div className="cm-main">
        {/* LEFT PANEL */}
        <div className="cm-left">
          <div className="cm-field">
            <div className="cm-field-icon">
              <Icon name="database" size={16} />
            </div>
            <select
              className="cm-input cm-select cm-select-inline"
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

          <div className="cm-field">
            <div className="cm-field-icon">
              <Icon name="pencil" size={16} />
            </div>
            <input
              className="cm-input cm-input-inline"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="在此输入标题"
            />
          </div>

          <div className="cm-field">
            <div className="cm-field-icon">
              <Icon name="type" size={16} />
            </div>
            <input
              className="cm-input cm-input-inline"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="在此输入作者"
            />
          </div>

          <div className="cm-field">
            <div className="cm-field-icon">
              <Icon name="message" size={16} />
            </div>
            <input
              className="cm-input cm-input-inline"
              value={description}
              onClick={() => setPanelMode("DESC")}
              readOnly
              placeholder="在右侧编辑简介"
              style={{ cursor: "pointer" }}
            />
          </div>

          <div className="cm-field" style={{ marginBottom: 2 }}>
            <div className="cm-field-icon">
              <Icon name="users" size={16} />
            </div>
            <div style={{ flex: 1, fontSize: 13, color: "#64748b" }}>
              人员分配
            </div>
          </div>

          <div className="cm-assignments-list">
            {renderAssignRow("翻译", "translator", "ASSIGN_TRANS")}
            {renderAssignRow("校对", "proofreader", "ASSIGN_PROOF")}
            {renderAssignRow("嵌字", "typesetter", "ASSIGN_TYPE")}
            {renderAssignRow("美工", "redrawer", "ASSIGN_ART")}
            {renderAssignRow("监修", "reviewer", "ASSIGN_REVIEW")}
          </div>

          {/* 图片上传区域 */}
          <div className="cm-upload-toolbar">
            <div className="cm-upload-left">
              <Icon name="image" size={16} />
              <span className="cm-upload-label">图片管理</span>
            </div>
            <div className="cm-upload-right">
              <NatureButton
                variant="cloud"
                onClick={() => setPanelMode("UPLOAD_LIST")}
                fontSize={12}
                minWidth={80}
              >
                已上传列表
              </NatureButton>
              <NatureButton
                variant="mist"
                onClick={handleSelectUpload}
                fontSize={12}
                minWidth={80}
              >
                选择上传
              </NatureButton>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="cm-right">
          <div className="selector-scrollable">
            {panelMode === "NONE" && (
              <div className="cm-empty-right">
                <p>
                  在左侧点击"选择"
                  <br />
                  以在此处显示选择器
                </p>
              </div>
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
                  className="cm-textarea"
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
              <UserSelector
                teamId={appState.currentTeamId}
                onSelect={handleAssignMember}
                onExit={() => setPanelMode("NONE")}
                placeholder="搜索成员..."
                allowedRole={
                  panelMode === "ASSIGN_TRANS"
                    ? "translator"
                    : panelMode === "ASSIGN_PROOF"
                    ? "proofreader"
                    : panelMode === "ASSIGN_TYPE"
                    ? "typesetter"
                    : panelMode === "ASSIGN_ART"
                    ? "redrawer"
                    : "reviewer"
                }
              />
            )}

            {panelMode === "UPLOAD_LIST" && (
              <div className="cm-upload-panel">
                <div className="cm-upload-header">
                  <h3 className="cm-upload-title">上传队列</h3>
                  <div className="cm-upload-stats">
                    {uploadStats.uploading > 0 && (
                      <span className="cm-stat uploading">
                        上传中: {uploadStats.uploading}
                      </span>
                    )}
                    {uploadStats.completed > 0 && (
                      <span className="cm-stat completed">
                        成功: {uploadStats.completed}
                      </span>
                    )}
                    {uploadStats.failed > 0 && (
                      <span className="cm-stat failed">
                        失败: {uploadStats.failed}
                      </span>
                    )}
                  </div>
                </div>

                <div className="cm-upload-content">
                  {uploadTasks.length === 0 && (
                    <div className="cm-upload-empty">暂无上传任务</div>
                  )}
                  {uploadTasks.map((task) => (
                    <div key={task.id} className="cm-upload-item">
                      <div className="cm-upload-item-name">{task.fileName}</div>
                      <div className="cm-upload-item-status">
                        {task.status === "pending" && (
                          <span className="status-badge pending">等待中</span>
                        )}
                        {task.status === "uploading" && (
                          <span className="status-badge uploading">
                            上传中...
                          </span>
                        )}
                        {task.status === "completed" && (
                          <span className="status-badge completed">已完成</span>
                        )}
                        {task.status === "failed" && (
                          <>
                            <span className="status-badge failed">失败</span>
                            <button
                              className="cm-retry-btn"
                              onClick={() => handleRetryTask(task.id)}
                            >
                              重试
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="cm-upload-footer">
                  {uploadStats.failed > 0 && (
                    <NatureButton
                      variant="cloud"
                      onClick={handleRetryAllFailed}
                      fontSize={12}
                      minWidth={100}
                    >
                      重试所有失败
                    </NatureButton>
                  )}
                  {uploadStats.completed > 0 && (
                    <NatureButton
                      variant="cloud"
                      onClick={handleClearCompleted}
                      fontSize={12}
                      minWidth={100}
                    >
                      清除已完成
                    </NatureButton>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="cm-footer">
        <NatureButton variant="mist" onClick={onClose} minWidth={100}>
          取消
        </NatureButton>
        <NatureButton variant="mist" onClick={handleSubmit} minWidth={100}>
          确认更新
        </NatureButton>
      </div>
    </div>
  );
}
