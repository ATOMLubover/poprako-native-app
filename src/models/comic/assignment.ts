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
