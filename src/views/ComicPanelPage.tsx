import { useState } from "react";
import TabBar from "../components/TabBar";
import ComicList from "../components/comic/ComicList";
import ComicCreator from "../components/ComicCreator";
import type { ComicBrief } from "../models/comic/comic";
import type { Workset } from "../models/workset";
import type { ComicFilterOptions } from "../models/comic/option";
import { DEFAULT_FILTER_OPTIONS } from "../models/comic/option";
import "./ComicPanelPage.css";

type TabId = "comic-list" | "assignment-list" | "member-list";

/**
 * 漫画仪表盘页面
 *
 * 包含三个标签页：
 * - 漫画列表：展示所有漫画
 * - 派活列表：展示任务分配情况（待实现）
 * - 成员列表：展示团队成员信息（待实现）
 */
export default function ComicPanelPage() {
  const [activeTab, setActiveTab] = useState<TabId>("comic-list");
  const [filterOptions, setFilterOptions] = useState<ComicFilterOptions>(
    DEFAULT_FILTER_OPTIONS
  );
  const [viewMode, setViewMode] = useState<"list" | "creator">("list");

  const tabItems = [
    { id: "comic-list" as TabId, label: "漫画列表" },
    { id: "assignment-list" as TabId, label: "派活列表" },
    { id: "member-list" as TabId, label: "成员列表" },
  ];

  const mockCollections: Workset[] = [
    {
      id: "collection-1",
      index: 1,
      name: "科幻系列",
      comicCount: 12,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "collection-2",
      index: 2,
      name: "恋爱系列",
      comicCount: 8,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "collection-3",
      index: 3,
      name: "冒险系列",
      comicCount: 15,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: "collection-4",
      index: 4,
      name: "治愈系列",
      comicCount: 10,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const initialComics: ComicBrief[] = Array.from({ length: 50 }, (_, i) => {
    const titles = [
      "幻象之城",
      "时空旅人",
      "星海远航",
      "记忆碎片",
      "梦境边缘",
      "暗影猎人",
      "光之守护",
      "永恒之夜",
      "命运轮回",
      "失落的世界",
      "虚拟现实",
      "机械之心",
      "异次元空间",
      "神秘代码",
      "未来都市",
      "古老传说",
      "魔法学院",
      "银河边境",
      "时间裂缝",
      "平行宇宙",
    ];

    const authors = [
      "山田太郎",
      "铃木花子",
      "佐藤次郎",
      "田中美咲",
      "小林健太",
      "渡边爱",
      "高橋誠",
      "伊藤真理",
      "中村健",
      "小野寺优",
    ];

    const tagPool = [
      "科幻",
      "冒险",
      "治愈",
      "悬疑",
      "恋爱",
      "赛博朋克",
      "奇幻",
      "日常",
      "惊悚",
      "校园",
      "历史",
      "战争",
      "萌系",
      "动作",
      "体育",
      "音乐",
      "美食",
      "职场",
      "家庭",
      "青春",
    ];

    const tagCount = Math.floor(Math.random() * 8);
    const tags = Array.from({ length: tagCount }, (_, j) => ({
      tagId: `tag-${i}-${j}`,
      name: tagPool[(i + j) % tagPool.length],
    }));

    const isLongTitle = i % 9 === 0;
    const title = isLongTitle
      ? `${titles[i % titles.length]}——超长标题测试用例随机字符串追加内容`
      : titles[i % titles.length];

    const likesCount =
      i % 12 === 0
        ? Math.floor(Math.random() * 500000) + 5000
        : Math.floor(Math.random() * 300);

    const isHidden = i % 20 === 0;

    const maybeDate = (daysAgo: number) =>
      Math.random() > 0.3
        ? new Date(Date.now() - Math.random() * daysAgo * 24 * 3600 * 1000)
        : undefined;

    const collectionIndex = Math.floor(i / 10) + 1;
    const indexInCollection = (i % 10) + 1;

    return {
      id: `comic-${String(i + 1).padStart(3, "0")}`,
      collectionId: `collection-${(i % 4) + 1}`,
      collectionIndex: String(collectionIndex),
      index: indexInCollection,
      author: authors[i % authors.length],
      title,
      isSeries: i % 4 === 0,
      likesCount,
      tags,
      isHidden,
      // 补充缺失的字段以匹配 `ComicBrief` 类型
      worksetId: `workset-${(i % 4) + 1}`,
      worksetIndex: collectionIndex,
      creatorId: `creator-${i % authors.length}`,
      pageCount: Math.floor(Math.random() * 50) + 1,
      translationStartedAt: i % 3 === 0 ? maybeDate(40) : undefined,
      translationCompletedAt: i % 7 === 0 ? maybeDate(30) : undefined,
      proofreadingStartedAt: i % 5 === 0 ? maybeDate(35) : undefined,
      proofreadingCompletedAt: i % 9 === 0 ? maybeDate(25) : undefined,
      typesettingStartedAt: i % 6 === 0 ? maybeDate(28) : undefined,
      typesettingCompletedAt: i % 11 === 0 ? maybeDate(20) : undefined,
      reviewedAt: i % 13 === 0 ? maybeDate(15) : undefined,
      publishedAt: i % 18 === 0 ? maybeDate(8) : undefined,
      createdAt: new Date(Date.now() - Math.random() * 120 * 24 * 3600 * 1000),
      updatedAt: new Date(Date.now() - Math.random() * 15 * 24 * 3600 * 1000),
    } as ComicBrief;
  });

  const [mockComics, _setMockComics] = useState<ComicBrief[]>(initialComics);

  const handleCreateNewComic = () => {
    setViewMode("creator");
  };

  const handleCreatorClose = () => {
    setViewMode("list");
  };

  const handleComicCreated = async (newComic: any) => {
    // TODO: 实际调用 IPC 创建漫画
    // await ipcCreateComic(newComic);

    // Mock: 为演示目的，暂时只切换回列表（实际应添加新漫画到列表）
    console.log("Comic created:", newComic);
    setViewMode("list");
  };

  const renderContent = () => {
    switch (activeTab) {
      case "comic-list":
        if (viewMode === "creator") {
          return (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                padding: "20px",
              }}
            >
              <ComicCreator
                onClose={handleCreatorClose}
                onCreate={handleComicCreated}
              />
            </div>
          );
        }
        return (
          <ComicList
            comics={mockComics}
            collections={mockCollections}
            filterOptions={filterOptions}
            onFilterChange={setFilterOptions}
            onCreateNewComic={handleCreateNewComic}
          />
        );
      case "assignment-list":
        return (
          <div className="placeholder-content">
            <p>派活列表功能开发中...</p>
          </div>
        );
      case "member-list":
        return (
          <div className="placeholder-content">
            <p>成员列表功能开发中...</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="comic-panel-page">
      <div className="tab-bar-wrapper">
        <TabBar
          items={tabItems}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </div>

      <div className="comic-panel-content">{renderContent()}</div>
    </div>
  );
}
