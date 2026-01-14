// import type { ComicBrief } from "../models/comic/comic.ts";
// import SimpleComicTeamTag from "./SimpleComicTeamTag.tsx";
// import "./SimpleComicItem.css";

// type SimpleComicItemProps = {
//   data: SimpleComicInfo;
//   onSelect?: (id: string) => void;
// };

// /**
//  * SimpleComicItem 组件
//  * 展示单个漫画卡片，显示 【author】title 和 team tag
//  */
// export default function SimpleComicItem({
//   data,
//   onSelect,
// }: SimpleComicItemProps) {
//   return (
//     <div
//       className="simple-comic-item ps-card"
//       onClick={() => onSelect && onSelect(data.id)}
//       style={{ cursor: onSelect ? "pointer" : "default" }}
//     >
//       <div className="ps-item-line1">
//         【{data.author}】{data.title}
//       </div>
//       <div className="ps-item-tags">
//         <SimpleComicTeamTag name={data.team.name} />
//       </div>
//     </div>
//   );
// }
