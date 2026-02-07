import { LoginArgs, LoginReply } from "../models/user";
import { proxyGet, proxyPost } from "./http";

const encoder = new TextEncoder();

export const loginUser = async (args: LoginArgs) => {
  type RawReply = {
    token: string;
  };

  const body = encoder.encode(JSON.stringify(args));

  const rawReplyStr = await proxyPost(
    `${import.meta.env.VITE_API_BASE_URL}/login`,
    {
      // Authorization: "Bearer " + getAuthToken(),
    },
    body
  );

  const rawReply = JSON.parse(rawReplyStr) as RawReply;

  return {
    token: rawReply.token,
  } as LoginReply;
};

export const fetchCurrUserInfo = async () => {
  type RawReply = {
    id: string;
    nickname: string;
    qq: string;

    is_admin: boolean;

    // 所有的单位都是 秒 时间戳
    assigned_translator_at?: number;
    assigned_proover_at?: number;
    assigned_typesetter_at?: number;
    assigned_redrawer_at?: number;
    assigned_reviewer_at?: number;
    assigned_uploader_at?: number;

    created_at: string;
    updated_at: string;
  };

  const rawReplyStr = await proxyGet(
    `${import.meta.env.VITE_API_BASE_URL}/users/me`,
    {}
  );

  const rawReply = JSON.parse(rawReplyStr) as RawReply;

  return {
    id: rawReply.id,
    nickname: rawReply.nickname,
    qq: rawReply.qq,
    isAdmin: rawReply.is_admin,
    assignedTranslatorAt: rawReply.assigned_translator_at
      ? new Date(rawReply.assigned_translator_at * 1000)
      : undefined,
    assignedProoverAt: rawReply.assigned_proover_at
      ? new Date(rawReply.assigned_proover_at * 1000)
      : undefined,
    assignedTypesetterAt: rawReply.assigned_typesetter_at
      ? new Date(rawReply.assigned_typesetter_at * 1000)
      : undefined,
    assignedRedrawerAt: rawReply.assigned_redrawer_at
      ? new Date(rawReply.assigned_redrawer_at * 1000)
      : undefined,
    assignedReviewerAt: rawReply.assigned_reviewer_at
      ? new Date(rawReply.assigned_reviewer_at * 1000)
      : undefined,
    assignedUploaderAt: rawReply.assigned_uploader_at
      ? new Date(rawReply.assigned_uploader_at * 1000)
      : undefined,
    createdAt: new Date(rawReply.created_at),
    updatedAt: new Date(rawReply.updated_at),
  };
};
