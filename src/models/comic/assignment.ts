// 漫画中分配任务的信息
export type AssignmentInfo = {
  id: string;

  uerId: string;
  userNickname: string;

  comicId: string;
  comicCollectionId: string;
  comicIndex: string;
  comicTitle: string;

  assignedTranslatorAt?: Date;
  assignedProofreaderAt?: Date;
  assignedTypesetterAt?: Date;
  assignedRedrawerAt?: Date;
  assignedReviewerAt?: Date;

  createdAt: Date;
  updatedAt: Date;
};

// 漫画中分配任务的简要信息
export type AssignmentBrief = {
  userId: string;
  userNickname: string;

  assignedTranslatorAt?: Date;
  assignedProofreaderAt?: Date;
  assignedTypesetterAt?: Date;
  assignedRedrawerAt?: Date;
  assignedReviewerAt?: Date;
};

// 用于创建或更新漫画任务分配的数据结构
export type NewAssignment = {
  comicId: string;
  userId: string;

  assignTranslator?: boolean;
  assignProofreader?: boolean;
  assignTypesetter?: boolean;
  assignRedrawer?: boolean;
  assignReviewer?: boolean;
};
