// import { useState, useRef, useEffect, KeyboardEvent } from "react";
// import NatureButton from "./NatureButton";
// import NatureTag from "./NatureTag";
// import "./TagSelector.css";
// import type { Tag, TagBrief } from "../models/tag";

// type TagSelectorProps = {
//   onSearchTags?: (query: string) => Promise<Tag[]>;
//   placeholder?: string;
//   onSelect?: (tag: TagBrief) => void;
//   onExit?: () => void;
// };

// /**
//  * TagSelector 组件
//  * - 用于搜索和选择标签
//  */
// export default function TagSelector({
//   onSearchTags,
//   placeholder = "搜索标签...",
//   onSelect,
//   onExit,
// }: TagSelectorProps) {
//   const [query, setQuery] = useState<string>("");
//   const [results, setResults] = useState<Tag[]>([]);
//   const [loading, setLoading] = useState<boolean>(false);
//   const [_error, setError] = useState<string | null>(null);

//   const inputRef = useRef<HTMLInputElement | null>(null);

//   // 内部 mock
//   async function __mockSearchTags(q: string): Promise<Tag[]> {
//     await new Promise((res) => setTimeout(res, 200));

//     // 生成一些 mock tags
//     const prefixes = [
//       "热血",
//       "恋爱",
//       "校园",
//       "奇幻",
//       "冒险",
//       "搞笑",
//       "日常",
//       "百合",
//     ];
//     const list: Tag[] = prefixes.map((p, i) => ({
//       id: `tag_${i}`,
//       name: q ? `${p} - ${q}` : p,
//       picaCandidates: [],
//       ehentaiCandidates: [],
//       creatorId: "mock",
//       createdAt: new Date(),
//       updatedAt: new Date(),
//     }));

//     return list;
//   }

//   // 执行搜索
//   async function performSearch(q: string) {
//     setLoading(true);
//     setError(null);
//     try {
//       const data = onSearchTags
//         ? await onSearchTags(q)
//         : await __mockSearchTags(q);
//       setResults(data);
//     } catch (err) {
//       setError("搜索失败");
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   }

//   useEffect(() => {
//     // 初始加载一次
//     performSearch("");
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   useEffect(() => {
//     const handler = setTimeout(() => {
//       performSearch(query);
//     }, 300);
//     return () => clearTimeout(handler);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [query]);

//   // 自动聚焦
//   useEffect(() => {
//     if (inputRef.current) {
//       inputRef.current.focus();
//     }
//   }, []);

//   const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
//     if (e.key === "Escape") {
//       onExit?.();
//     }
//   };

//   return (
//     <div className="tag-selector-container project-selector">
//       <div className="ps-input-row">
//         <input
//           ref={inputRef}
//           className="ps-input"
//           placeholder={placeholder}
//           value={query}
//           onChange={(e) => setQuery(e.target.value)}
//           onKeyDown={handleKeyDown}
//         />
//         <NatureButton variant="cloud" onClick={onExit}>
//           取消
//         </NatureButton>
//       </div>

//       <div className="tag-list-grid">
//         {loading && <div className="ps-loading">Loading...</div>}
//         {!loading &&
//           results.map((tag) => (
//             <div key={tag.id} className="ts-tag-item">
//               <NatureTag
//                 tag={tag}
//                 onClick={() => onSelect?.({ id: tag.id, name: tag.name })}
//               />
//             </div>
//           ))}
//       </div>
//     </div>
//   );
// }
