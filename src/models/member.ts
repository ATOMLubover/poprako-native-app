// 汉化组成员信息
export type MemberInfo = {
  memberId: string;
  nickname: string;
  teamId: string;
  teamName: string;
  is_admin: boolean;
  is_translator: boolean;
  is_proofreader: boolean;
  is_typesetter: boolean;
  is_redrawer: boolean;
  is_reviewer: boolean;
  createdAt: Date;
  updatedAt: Date;
};
