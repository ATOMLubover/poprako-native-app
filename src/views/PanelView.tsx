import { useState } from "react";
import UserProfileCard from "../components/UserProfileCard";
import TeamProfileCard from "../components/TeamProfileCard";
import Icon from "../components/Icon";
import VerticalAdaptiveList from "../components/VerticalAdaptiveList";
import { smallHeightItems, largeHeightItems } from "../models/adaptiveList";
import "./PanelView.css";

type MenuItem = "draft-board" | "dashboard" | "messages" | "analytics" | "resources" | "settings";

type NavItem = {
  id: MenuItem;
  icon: string;
  label: string;
};

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
          <div style={{ display: "flex", flexDirection: "column", gap: 24, paddingTop: 18, height: "100%", minHeight: 0 }}>
            <div style={{ display: "flex", gap: 24, justifyContent: "center" }}>
              <UserProfileCard />
              <TeamProfileCard />
            </div>

            <div style={{ display: "flex", gap: 24, justifyContent: "center", paddingBottom: 20, flex: 1, minHeight: 0, overflow: "hidden" }}>
              <VerticalAdaptiveList
                items={smallHeightItems}
                gap={5}
                title="自适应列表 - 小项目 (40px)"
                debug={true}
              />
              <VerticalAdaptiveList
                items={largeHeightItems}
                gap={5}
                title="自适应列表 - 大项目 (80px)"
                debug={true}
              />
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
