// import { useEffect, useState } from "react";
// import "./UserProfileCard.css";

// import type { UserProfile } from "../models/user";
// import type { SavePayload } from "./UserProfileModifierCard";
// import NatureTag from "./NatureTag";
// import NatureButton from "./NatureButton";
// import Icon from "./Icon";
// import UserProfileModifierCard from "./UserProfileModifierCard";

// type Props = {
//   initialProfile?: UserProfile;
// };

// /**
//  * 用户信息悬浮 Card（React 版）
//  * 对应 samples/user-profile-card.html，便于在草稿板中预览
//  */
// export default function UserProfileCard({ initialProfile }: Props) {
//   const defaultProfile: UserProfile = {
//     id: "u-0001",
//     nickname: "林深时见鹿",
//     isAdmin: false,
//     qq: "123456789",
//     // tags: [
//     //   { tagId: "t-001", name: "黑长直", isPinned: false, likedNum: 0 },
//     //   { tagId: "t-002", name: "萝莉", isPinned: false, likedNum: 0 },
//     //   { tagId: "t-003", name: "纯爱", isPinned: false, likedNum: 0 },
//     // ],
//     // avatarUrl: "https://placehold.co/72x72/81C784/ffffff?text=L",
//     // signature: "树深时见鹿，溪午不闻钟。",
//     createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
//     updatedAt: new Date(),
//     // isMe: true,
//   };

//   const [profile, setProfile] = useState<UserProfile>(
//     initialProfile ?? defaultProfile
//   );
//   const [showModifierModal, setShowModifierModal] = useState<boolean>(false);

//   useEffect(() => {
//     if (initialProfile) {
//       setProfile(initialProfile);
//     }
//   }, [initialProfile]);

//   function formatDate(d?: string | Date) {
//     const date = d ? new Date(d) : new Date();
//     return date.toLocaleDateString("en", {
//       year: "numeric",
//       month: "long",
//       day: "numeric",
//     });
//   }

//   function handleEditProfile() {
//     setShowModifierModal(true);
//   }

//   function handleSaveProfile(payload: SavePayload) {
//     setProfile((prev) => ({
//       ...prev,
//       nickname: payload.nickname,
//       signature: payload.signature,
//     }));
//     setShowModifierModal(false);
//   }

//   function handleCloseModal() {
//     setShowModifierModal(false);
//   }

//   return (
//     <div className="profile-card">
//       <div className="avatar-container">
//         <img
//           id="user-avatar"
//           className="avatar"
//           src={profile.avatarUrl}
//           alt={profile.nickname}
//           onError={(e) => {
//             const img = e.currentTarget as HTMLImageElement;
//             img.onerror = null;
//             img.src = "https://placehold.co/72x72/A3C9CC/ffffff?text=U";
//           }}
//         />
//         {profile.isMe ? (
//           <div style={{ marginTop: 8 }}>
//             <NatureButton variant="cloud" onClick={handleEditProfile}>
//               修改
//             </NatureButton>
//           </div>
//         ) : null}
//       </div>

//       <div className="info-container">
//         <span className="nickname">{profile.nickname}</span>

//         {profile.signature ? (
//           <p className="user-signature" title={profile.signature}>
//             {profile.signature}
//           </p>
//         ) : null}

//         <div className="tags-container">
//           {profile.tags.map((t) => (
//             <NatureTag key={t.tagId} tag={t} theme="theme-mist" />
//           ))}
//         </div>

//         <span className="created-at">
//           <Icon name="clock" className="clock-icon" />
//           {formatDate(profile.lastActive)}
//         </span>
//       </div>

//       {showModifierModal ? (
//         <div className="modal-overlay" onClick={handleCloseModal}>
//           <div className="modal-container" onClick={(e) => e.stopPropagation()}>
//             <UserProfileModifierCard
//               initialNickname={profile.nickname}
//               initialSignature={profile.signature}
//               onSave={handleSaveProfile}
//             />
//             <button
//               className="modal-close-button"
//               onClick={handleCloseModal}
//               title="关闭"
//               aria-label="关闭"
//             >
//               <svg
//                 xmlns="http://www.w3.org/2000/svg"
//                 width="24"
//                 height="24"
//                 viewBox="0 0 24 24"
//                 fill="none"
//                 stroke="currentColor"
//                 strokeWidth="2"
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//               >
//                 <path d="M18 6l-12 12M6 6l12 12" />
//               </svg>
//             </button>
//           </div>
//         </div>
//       ) : null}
//     </div>
//   );
// }
