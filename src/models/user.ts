// 用户资料类型定义
export type UserInfo = {
  id: string;
  nickname: string;
  qq: string;
  //tags: Tag[];

  isAdmin: boolean;

  assignedTranslatorAt?: Date;
  assignedProoverAt?: Date;
  assignedTypesetterAt?: Date;
  assignedRedrawerAt?: Date;
  assignedReviewerAt?: Date;
  assignedUploaderAt?: Date;

  createdAt: Date;
  updatedAt: Date;
};

// 用户简要信息
export type UserBrief = {
  id: string;
  nickname: string;
  // tags: Tag[];

  assignedTranslatorAt?: Date;
  assignedProofreaderAt?: Date;
  assignedTypesetterAt?: Date;
  assignedRedrawerAt?: Date;
  assignedReviewerAt?: Date;
  assignedUploaderAt?: Date;
};

// 登录请求
export type LoginArgs = {
  qq: string;
  password: string;
  invitationCode?: string;
  nickname?: string;
};

// 登录响应
export type LoginReply = {
  token: string;
};
