import { useState, useRef, useEffect, KeyboardEvent } from "react";
import NatureButton from "./NatureButton";
import "./UserSelector.css";
import type { UserBrief } from "../models/user";

type UserSelectorProps = {
  // 外部传入的搜索函数，如果未传入则使用内部 mock
  onSearchUsers?: (query: string) => Promise<UserBrief[]>;
  placeholder?: string;
  onSelect?: (member: UserBrief) => void;
  onExit?: () => void;
  // 限制搜索的 TeamId，当前 mock 实现暂不使用
  teamId?: string | null;
  // 仅允许具有该职位的成员出现在搜索结果中（可选）
  allowedRole?:
    | "translator"
    | "proofreader"
    | "typesetter"
    | "redrawer"
    | "reviewer";
};

/**
 * 获取成员的职位列表
 */
function getUserRoles(user: UserBrief): string[] {
  const roles: string[] = [];

  if (user.assignedTranslatorAt) roles.push("翻译");
  if (user.assignedProofreaderAt) roles.push("校对");
  if (user.assignedTypesetterAt) roles.push("嵌字");
  if (user.assignedRedrawerAt) roles.push("修图");
  if (user.assignedReviewerAt) roles.push("审核");

  return roles;
}

/**
 * UserSelector 组件
 * - 用于搜索和选择成员
 * - 内部包含 mock 实现
 */
export default function UserSelector({
  onSearchUsers: onSearchMembers,
  placeholder = "搜索成员...",
  onSelect,
  onExit,
  // 限制搜索的 TeamId，当前 mock 实现暂不使用
  teamId: _teamId,
  // 如果传入，该选择器只展示拥有该职位的成员
  allowedRole,
}: UserSelectorProps) {
  const [query, setQuery] = useState<string>("");
  const [results, setResults] = useState<UserBrief[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  // 内部 mock：生成示例成员数据
  async function __mockSearchMembers(q: string): Promise<UserBrief[]> {
    await new Promise((res) => setTimeout(res, 250));

    const displayQ = q.trim() || "User";

    // 模拟生成 5 个结果
    const list: UserBrief[] = Array.from({ length: 5 }).map((_, i) => {
      // 随机决定该 mock 成员是否具备某些职位（用于演示）
      const assignedTranslatorAt = Math.random() > 0.7 ? new Date() : undefined;
      const assignedProofreaderAt =
        Math.random() > 0.76 ? new Date() : undefined;
      const assignedTypesetterAt =
        Math.random() > 0.78 ? new Date() : undefined;
      const assignedRedrawerAt = Math.random() > 0.82 ? new Date() : undefined;
      const assignedReviewerAt = Math.random() > 0.85 ? new Date() : undefined;

      return {
        id: `m_${i + 100}`,
        nickname: `${displayQ}_${i + 1}`,
        assignedTranslatorAt,
        assignedProofreaderAt,
        assignedTypesetterAt,
        assignedRedrawerAt,
        assignedReviewerAt,
      } as UserBrief;
    });

    return list;
  }

  // 执行搜索
  async function performSearch(q: string) {
    if (!q.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = onSearchMembers
        ? await onSearchMembers(q)
        : await __mockSearchMembers(q);

      // 如果指定了 allowedRole，则过滤出具有对应职位的成员
      const hasRole = (
        member: UserBrief,
        role: UserSelectorProps["allowedRole"]
      ) => {
        if (!role) return true;
        switch (role) {
          case "translator":
            return Boolean(member.assignedTranslatorAt);
          case "proofreader":
            return Boolean(member.assignedProofreaderAt);
          case "typesetter":
            return Boolean(member.assignedTypesetterAt);
          case "redrawer":
            return Boolean(member.assignedRedrawerAt);
          case "reviewer":
            return Boolean(member.assignedReviewerAt);
          default:
            return true;
        }
      };

      const filtered = allowedRole
        ? data.filter((m) => hasRole(m, allowedRole))
        : data;

      setResults(filtered);
    } catch (err) {
      setError("搜索失败");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // 防抖搜索
  useEffect(() => {
    const handler = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // 自动聚焦输入框
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      onExit?.();
    }
  };

  return (
    <div className="member-req-selector-container">
      <div className="ps-input-row">
        <input
          ref={inputRef}
          className="ps-input"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <NatureButton variant="cloud" onClick={onExit}>
          取消
        </NatureButton>
      </div>

      <div className="ps-result-list">
        {loading && <div className="ps-loading">搜索中...</div>}
        {error && <div className="ps-error">{error}</div>}
        {!loading && !error && results.length === 0 && query.trim() !== "" && (
          <div className="ps-empty">未找到匹配成员</div>
        )}
        {!loading && !error && results.length === 0 && query.trim() === "" && (
          <div className="ps-empty">输入关键字以搜索成员...</div>
        )}

        {!loading &&
          results.map((user) => {
            const roles = getUserRoles(user);
            return (
              <div
                key={user.id}
                className="member-item"
                onClick={() => onSelect?.(user)}
              >
                <div className="member-item-info">
                  <span className="member-item-name">{user.nickname}</span>
                  {roles.length > 0 && (
                    <div className="member-item-roles">
                      {roles.map((role) => (
                        <span key={role} className="member-role-tag">
                          {role}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
