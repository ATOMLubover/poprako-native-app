import { useState } from "react";
import Icon from "../components/Icon";
// Draft-board 简化为 SimpleTermCard 预览
import SimpleTermCard from "../components/SimpleTermCard";
import "./PanelView.css";

type MenuItem = "draft-board" | "team-list" | "tag-pool" | "termbase-pool" | "font-repo" | "compressor-helper" | "settings";

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
    { id: "team-list", icon: "users", label: "汉化组列表" },
    { id: "tag-pool", icon: "tag", label: "漫画标签池" },
    { id: "termbase-pool", icon: "database", label: "术语库" },
    { id: "font-repo", icon: "font", label: "字体仓库" },
    { id: "compressor-helper", icon: "image", label: "压图工具" },
  ];

  const settingsItem: NavItem = { id: "settings", icon: "settings", label: "设置" };

  const renderContent = () => {
    switch (activeItem) {
      case "draft-board":
        return (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, paddingTop: 12, height: "100%", minHeight: 0 }}>
            <div style={{ marginTop: 6 }}>
              <h2 style={{ margin: 0, marginBottom: 10 }}>Draft Board</h2>

              <div style={{ marginTop: 6 }}>
                <div className="nb-card" style={{ padding: "12px 14px" }}>
                  <div className="nb-section-title" style={{ marginBottom: 8 }}>SimpleTermCard — Draft Demo</div>

                  <div style={{ display: "flex", gap: 12, justifyContent: "center", padding: "12px 0", flexWrap: "wrap" }}>
                    <SimpleTermCard
                      data={{
                        termBaseId: "tb-001",
                        original: "ふわふわ",
                        definition: "形容柔软且轻盈的状态，常用于描述棉花糖或云朵。",
                        modifierId: "u-99",
                        modifierNickname: "Hatsu1ki",
                        createdAt: new Date("2024-06-10"),
                        updatedAt: new Date("2024-06-12T10:30:00"),
                      }}
                      onClick={(t) => console.log("点击术语", t)}
                    />

                    <SimpleTermCard
                      data={{
                        termBaseId: "tb-002",
                        original: "ぽかぽか",
                        definition: "形容温暖舒适的感觉，常用于天气或环境描述。",
                        modifierId: "u-55",
                        modifierNickname: "Yuki",
                        createdAt: new Date("2024-01-02"),
                        updatedAt: new Date("2024-02-15T09:00:00"),
                      }}
                      onClick={(t) => console.log("点击术语", t)}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      case "team-list":
        return <div>汉化组列表页面开发中</div>;
      case "tag-pool":
        return <div>漫画标签池页面开发中</div>;
      case "termbase-pool":
        return <div>术语库页面开发中</div>;
      case "font-repo":
        return <div>字体仓库页面开发中</div>;
      case "compressor-helper":
        return <div>压图工具页面开发中</div>;
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
