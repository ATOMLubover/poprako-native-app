import { useEffect, useState } from "react";
import "./UserProfileCard.css";

import type { UserProfile } from "../models/user";
import type { SavePayload } from "./UserProfileModifierCard";
import NatureTag from "./NatureTag";
import UserProfileModifierCard from "./UserProfileModifierCard";

type Props = {
  initialProfile?: UserProfile;
};

/**
 * 用户信息悬浮 Card（React 版）
 * 对应 samples/user-profile-card.html，便于在草稿板中预览
 */
export default function UserProfileCard({
  initialProfile,
}: Props) {
  const defaultProfile: UserProfile = {
    userId: "u-0001",
    nickname: "林深时见鹿",
    tags: [
      { tagId: "t-001", name: "黑长直" },
      { tagId: "t-002", name: "萝莉" },
      { tagId: "t-003", name: "纯爱" },
    ],
    avatarUrl: "https://placehold.co/72x72/81C784/ffffff?text=L",
    createdAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
    isMe: true,
  };

  const [profile, setProfile] = useState<UserProfile>(initialProfile ?? defaultProfile);
  const [showModifierModal, setShowModifierModal] = useState<boolean>(false);

  useEffect(() => {
    if (initialProfile) {
      setProfile(initialProfile);
    }
  }, [initialProfile]);

  function formatDate(d?: string | Date) {
    const date = d ? new Date(d) : new Date();
    return date.toLocaleDateString("en", { year: "numeric", month: "long", day: "numeric" });
  }

  function handleEditProfile() {
    setShowModifierModal(true);
  }

  function handleSaveProfile(payload: SavePayload) {
    setProfile((prev) => ({
      ...prev,
      nickname: payload.nickname,
    }));
    setShowModifierModal(false);
  }

  function handleCloseModal() {
    setShowModifierModal(false);
  }

  return (
    <div className="profile-card">
      <div className="avatar-container">
        <img
          id="user-avatar"
          className="avatar"
          src={profile.avatarUrl}
          alt={profile.nickname}
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            img.onerror = null;
            img.src = "https://placehold.co/72x72/A3C9CC/ffffff?text=U";
          }}
        />
      </div>

      <div className="info-container">
        <span className="nickname">{profile.nickname}</span>

        <div className="tags-container">
          {profile.tags.map((t) => (
            <NatureTag key={t.tagId} tag={t} theme="theme-mist" />
          ))}

          {profile.isMe ? (
            <button className="nature-tag edit-tag-button" title="修改信息" onClick={handleEditProfile}>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 3a2.85 2.85 0 0 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
            </button>
          ) : null}
        </div>

        <span className="created-at">
          <span className="clock-icon">CREATED AT</span>
          {formatDate(profile.createdAt)}
        </span>
      </div>

      {showModifierModal ? (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <UserProfileModifierCard
              initialNickname={profile.nickname}
              onSave={handleSaveProfile}
            />
            <button
              className="modal-close-button"
              onClick={handleCloseModal}
              title="关闭"
              aria-label="关闭"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6l-12 12M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
