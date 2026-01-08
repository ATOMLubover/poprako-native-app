// 工作集的详细信息
export type Collection = {
  id: string;

  teamId: string;
  // 作品集名称
  name: string;

  comicCount: number;

  createdAt: Date;
  updatedAt: Date;
};
