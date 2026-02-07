import { invoke } from "@tauri-apps/api/core";
import { proxyGet } from "./http";
import { CheckUpdateResp as CheckUpdateReply } from "../models/check";

export const getNativeAppVersion = async () => {
  try {
    const version = invoke<string>("get_native_app_version");

    return version;
  } catch (error) {
    console.error("Failed to get native app version:", error);
    throw error;
  }
};

export const checkUpdate = async () => {
  type RawReply = {
    latest_version: string;
    title: string;
    allow_usage: boolean;
    description: string;
  };

  const version = await getNativeAppVersion();

  const rawReplyStr = await proxyGet(
    `${import.meta.env.VITE_API_BASE_URL}/check-update`,
    {
      "X-Client-App-Version": version,
      "X-App-Platform": "desktop",
    }
  );

  const rawReply = JSON.parse(rawReplyStr) as RawReply;

  return {
    latestVersion: rawReply.latest_version,
    title: rawReply.title,
    allowUsage: rawReply.allow_usage,
    description: rawReply.description,
  } as CheckUpdateReply;
};
