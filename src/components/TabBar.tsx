import "./TabBar.css";

type TabItem<T extends string> = {
  id: T;
  label: string;
};

type TabBarProps<T extends string> = {
  items: TabItem<T>[];
  activeTab: T;
  onTabChange: (tabId: T) => void;
};

/**
 * 通用标签切换组件
 * 
 * 用于页面内多标签内容切换
 */
export default function TabBar<T extends string>({ items, activeTab, onTabChange }: TabBarProps<T>) {
  return (
    <div className="tab-bar">
      {items.map((item) => (
        <button
          key={item.id}
          className={`tab-item ${activeTab === item.id ? "active" : ""}`}
          onClick={() => onTabChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
