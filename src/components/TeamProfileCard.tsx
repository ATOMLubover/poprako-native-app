// // team 功能已移除
// type TeamProfile = {
//   teamId: string;
//   signature: string;
//   memberNum: number;
//   comicNum: number;
//   isHidden?: boolean;
//   tags?: any[];
// };
// import NatureTag from "./NatureTag";
// import "./TeamProfileCard.css";

// type Props = {
//   initial?: TeamProfile;
// };

// export default function TeamProfileCard({ initial }: Props) {
//   const defaultProfile: TeamProfile = initial ?? {
//     teamId: "白杨汉化组",
//     signature: "落英缤纷，寻向所志。我们专注于东方漫画翻译。",
//     memberNum: 24,
//     comicNum: 158,
//     isHidden: false,
//     tags: [
//       { tagId: "tt-1", name: "汉化", isPinned: false, likedNum: 0 },
//       { tagId: "tt-2", name: "翻译", isPinned: false, likedNum: 0 },
//     ],
//   };

//   return (
//     <div className={`team-card ${defaultProfile.isHidden ? "is-hidden" : ""}`}>
//       <div className="hidden-overlay">已隐藏</div>

//       <div className="card-header">
//         <div className="avatar-wrapper">
//           <div className="team-avatar-char">
//             {defaultProfile.teamId ? defaultProfile.teamId.charAt(0) : "?"}
//           </div>
//           <div className="status-badge">
//             <div
//               className={`status-dot ${
//                 defaultProfile.isHidden ? "" : "active"
//               }`}
//             ></div>
//           </div>
//         </div>

//         <div className="team-info">
//           <h3 className="team-name">{defaultProfile.teamId}</h3>
//           <p className="team-signature" title={defaultProfile.signature}>
//             {defaultProfile.signature}
//           </p>
//         </div>
//       </div>

//       <div className="tags-row">
//         {(defaultProfile.tags ?? []).map((t) => (
//           <NatureTag key={t.tagId} tag={t} theme="theme-mist" />
//         ))}
//       </div>

//       <div className="stats-grid">
//         <div className="stat-item">
//           <div className="stat-icon">
//             <svg
//               xmlns="http://www.w3.org/2000/svg"
//               width="18"
//               height="18"
//               viewBox="0 0 24 24"
//               fill="none"
//               stroke="currentColor"
//               strokeWidth={2}
//               strokeLinecap="round"
//               strokeLinejoin="round"
//             >
//               <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
//               <circle cx="9" cy="7" r="4" />
//               <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
//               <path d="M16 3.13a4 4 0 0 1 0 7.75" />
//             </svg>
//           </div>
//           <div className="stat-content">
//             <span className="stat-value">
//               {defaultProfile.memberNum.toLocaleString()}
//             </span>
//           </div>
//         </div>

//         <div className="stat-item">
//           <div className="stat-icon">
//             <svg
//               xmlns="http://www.w3.org/2000/svg"
//               width="18"
//               height="18"
//               viewBox="0 0 24 24"
//               fill="none"
//               stroke="currentColor"
//               strokeWidth={2}
//               strokeLinecap="round"
//               strokeLinejoin="round"
//             >
//               <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
//               <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
//             </svg>
//           </div>
//           <div className="stat-content">
//             <span className="stat-value">
//               {defaultProfile.comicNum.toLocaleString()}
//             </span>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
