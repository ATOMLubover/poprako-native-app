import { useState } from "react";
import TagDetailCard from "./TagDetailCard";
import TagDetailModifier from "./TagDetailModifier";
import "./TagDetailSwitch.css";

type DetailMode = "view" | "edit";

type PicaTag = {
  name: string;
};

type EhentaiTag = {
  name: string;
};

type Props = {
  tagName?: string;
  picaTags?: PicaTag[];
  ehentaiTags?: EhentaiTag[];
  relatedComics?: string[];
  onExit?: () => void;
};

/**
 * 标签详情切换容器
 * 支持在展示模式和编辑模式间切换
 */
export default function TagDetailSwitch({
  tagName = "和服 (Kimono)",
  picaTags = [
    { name: "和服" },
    { name: "传统服饰" },
    { name: "大和抚子" },
  ],
  ehentaiTags = [
    { name: "kimono" },
    { name: "traditional clothes" },
    { name: "female:kimono" },
  ],
  relatedComics = [
    "京都物语：樱花下的邂逅",
    "风铃馆的夏日回忆",
    "大正浪漫：银座的黄昏",
    "和服少女的秘密花园",
  ],
  onExit,
}: Props) {
  const [mode, setMode] = useState<DetailMode>("view");
  const [currentTagName, setCurrentTagName] = useState<string>(tagName);
  const [currentPicaTags, setCurrentPicaTags] = useState<string[]>(
    picaTags.map((t) => t.name)
  );
  const [currentEhTags, setCurrentEhTags] = useState<string[]>(
    ehentaiTags.map((t) => t.name)
  );

  function handleEdit() {
    setMode("edit");
  }

  function handleSave(payload: {
    name: string;
    picaTags: string[];
    ehTags: string[];
  }) {
    setCurrentTagName(payload.name);
    setCurrentPicaTags(payload.picaTags);
    setCurrentEhTags(payload.ehTags);
    setMode("view");

    console.log("标签已保存:", payload);
  }

  function handleCancel() {
    setMode("view");
  }

  return (
    <div className="tag-detail-switch">
      {mode === "view" && (
        <TagDetailCard
          tagName={currentTagName}
          picaTags={currentPicaTags.map((t) => ({ name: t }))}
          ehentaiTags={currentEhTags.map((t) => ({ name: t }))}
          relatedComics={relatedComics}
          onEdit={handleEdit}
          onExit={onExit}
        />
      )}

      {mode === "edit" && (
        <TagDetailModifier
          initialName={currentTagName}
          initialPicaTags={currentPicaTags}
          initialEhTags={currentEhTags}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}
