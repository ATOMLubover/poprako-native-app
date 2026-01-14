// import { Term } from "../models/term";
// import "./SimpleTermCard.css";

// type SimpleTermCardProps = {
//   data: Term;
//   onClick?: (term: Term) => void;
// };

// /**
//  * 简化版术语卡片组件
//  * 仅展示原文与定义，样式参考 samples/simplified-term-card.html
//  */
// export default function SimpleTermCard({ data, onClick }: SimpleTermCardProps) {
//   const handleClick = () => {
//     if (onClick) {
//       onClick(data);
//     }
//   };

//   return (
//     <div className="term-card-simple" onClick={handleClick}>
//       <div className="term-content">
//         <span className="term-original">{data.originalText}</span>
//         <span className="term-definition">{data.targetText}</span>
//       </div>
//     </div>
//   );
// }
