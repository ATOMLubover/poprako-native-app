import { TeamBrief } from "./team";

// 使用 simple 选项时获取到的漫画信息
export type SimpleComicInfo = {
  id: string;
  author: string;
  title: string;
  team: TeamBrief;
};
