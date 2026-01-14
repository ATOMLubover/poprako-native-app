// // 用户基础类型
// export type User = {
//   id: string;
//   qqId: string;
//   nickname: string;
//   passwordHash: string;
//   isAdmin: boolean;

//   assignedTranslatorAt?: Date;
//   assignedProoverAt?: Date;
//   assignedTypesetterAt?: Date;
//   assignedRedrawerAt?: Date;
//   assignedReviewerAt?: Date;
//   assignedUploaderAt?: Date;

//   createdAt: Date;
//   updatedAt: Date;
// };

// 用户资料类型定义
export type UserProfile = {
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
export type LoginReq = {
  qqId: string;
  password: string;
};

// 登录响应
export type LoginResp = {
  userId: string;
  token: string;
};
