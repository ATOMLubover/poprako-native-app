import { useState, useRef, useEffect, KeyboardEvent } from "react";
import NatureButton from "./NatureButton";
import "./MemberSelector.css";
import type { MemberBrief } from "../models/member";

type MemberSelectorProps = {
  // 外部传入的搜索函数，如果未传入则使用内部 mock
  onSearchMembers?: (query: string) => Promise<MemberBrief[]>;
  placeholder?: string;
  onSelect?: (member: MemberBrief) => void;
  onExit?: () => void;
  // 限制搜索的 TeamId，当前 mock 实现暂不使用
  teamId?: string | null;
};

/**
 * MemberSelector 组件
 * - 用于搜索和选择成员
 * - 内部包含 mock 实现
 */
export default function MemberSelector({
  onSearchMembers,
  placeholder = "搜索成员...",
  onSelect,
  onExit,
  // 限制搜索的 TeamId，当前 mock 实现暂不使用
  teamId: _teamId,
}: MemberSelectorProps) {
  const [query, setQuery] = useState<string>("");
  const [results, setResults] = useState<MemberBrief[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  // 内部 mock：生成示例成员数据
  async function __mockSearchMembers(q: string): Promise<MemberBrief[]> {
    await new Promise((res) => setTimeout(res, 250));

    const displayQ = q.trim() || "User";

    // 模拟生成 5 个结果
    const list: MemberBrief[] = Array.from({ length: 5 }).map((_, i) => ({
      memberId: `m_${i + 100}`,
      nickname: `${displayQ}_${i + 1}`,
      tags: [], // 简略信息暂不包含详细 Tag
      // 可以在此处添加 mock 的 assignedWrap
    }));

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
      setResults(data);
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
          results.map((member) => (
            <div
              key={member.memberId}
              className="member-item"
              onClick={() => onSelect?.(member)}
            >
              <div className="member-item-info">
                <span className="member-item-name">{member.nickname}</span>
                <span className="member-item-id">ID: {member.memberId}</span>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
