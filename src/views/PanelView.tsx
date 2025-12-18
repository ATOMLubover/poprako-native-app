import { useState } from "react";
import Icon from "../components/Icon";
import UserProfileCard from "../components/UserProfileCard";
import NatureTagLikesButton from "../components/NatureTagLikesButton";
import type { Tag } from "../models/tag";
import "./PanelView.css";

type MenuItem = "draft-board" | "dashboard" | "messages" | "analytics" | "resources" | "settings";

type NavItem = {
  id: MenuItem;
  icon: string;
  label: string;
};

// 示例 tag 数据，用于草稿板预览
const sampleTags: Array<{ tag: Tag; likes: number; theme: string }> = [
  { tag: { tagId: "1", name: "UI Design Ideas" }, likes: 1024, theme: "theme-mist" },
  { tag: { tagId: "2", name: "React Components" }, likes: 856, theme: "theme-glacier" },
  { tag: { tagId: "3", name: "Minimalism" }, likes: 42, theme: "theme-sand" },
];

/**
 * 主面板视图
 * 包含侧边栏导航和主内容区域
 */
export default function PanelView() {
  const [activeItem, setActiveItem] = useState<MenuItem>("draft-board");

  const navItems: NavItem[] = [
    { id: "draft-board", icon: "pencil", label: "草稿板" },
    { id: "dashboard", icon: "dashboard", label: "实时概览" },
    { id: "messages", icon: "message", label: "互动消息" },
    { id: "analytics", icon: "chart", label: "增长数据" },
    { id: "resources", icon: "layers", label: "资源库" },
  ];

  const settingsItem: NavItem = { id: "settings", icon: "settings", label: "设置" };

  const renderContent = () => {
    switch (activeItem) {
      case "draft-board":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 18, height: "100%", minHeight: 0 }}>
            {/* 草稿板保留 UserProfileCard 供预览检查，同时显示标签草稿预览 */}
            <div style={{ flex: 1, minHeight: 0 }}>
              <div className="nb-card">
                <div className="nb-section-title">User Profile — Draft Preview</div>

                <div className="nb-row" style={{ gap: 12, alignItems: "center" }}>
                  <UserProfileCard />
                </div>
              </div>
            </div>

            <div style={{ marginTop: 8 }}>
              <h2 style={{ margin: 0, marginBottom: 14 }}>Draft Board</h2>

              <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                {sampleTags.map((s) => (
                  <NatureTagLikesButton
                    key={s.tag.tagId}
                    tag={s.tag}
                    initialLikes={s.likes}
                    theme={s.theme}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      case "dashboard":
        return <div>实时概览页面开发中</div>;
      case "messages":
        return <div>互动消息页面开发中</div>;
      case "analytics":
        return <div>增长数据页面开发中</div>;
      case "resources":
        return <div>资源库页面开发中</div>;
      case "settings":
        return <div>设置页面开发中</div>;
      default:
        return <div>页面开发中</div>;
    }
  };

  return (
    <div className="panel-view">
      <nav className="sidebar">
        <div className="logo-section">
          <span className="logo-icon">
            <Icon name="tree-pine" />
          </span>
          <span className="logo-text">PopRaKo 白杨子</span>
        </div>

        <ul className="nav-list">
          {navItems.map((item) => (
            <li key={item.id}>
              <a
                href="#"
                className={`nav-item ${activeItem === item.id ? "active" : ""}`}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveItem(item.id);
                }}
              >
                <span className="icon-box">
                  <Icon name={item.icon} className="nav-icon" />
                </span>
                <span className="nav-text">{item.label}</span>
              </a>
            </li>
          ))}
        </ul>

        <div className="footer-section">
          <a
            href="#"
            className={`nav-item ${activeItem === settingsItem.id ? "active" : ""}`}
            onClick={(e) => {
              e.preventDefault();
              setActiveItem(settingsItem.id);
            }}
          >
            <span className="icon-box">
              <Icon name={settingsItem.icon} className="nav-icon" />
            </span>
            <span className="nav-text">{settingsItem.label}</span>
          </a>
        </div>
      </nav>

      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  );
}
