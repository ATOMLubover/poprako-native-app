import type { MemberInfo } from "../models/member";

type AppView = "login" | "panel";

type AppState = {
  view: AppView;
  isOnline: boolean;
  currentUser: MemberInfo | null;
};

let appState: AppState = {
  view: "login",
  isOnline: false,
  currentUser: null,
};

let listeners: Array<() => void> = [];

// 获取当前应用状态
export function getAppState(): AppState {
  return { ...appState };
}

// 设置应用视图
export function setAppView(view: AppView): void {
  appState.view = view;

  notifyListeners();
}

// 设置在线状态
export function setOnlineStatus(isOnline: boolean): void {
  appState.isOnline = isOnline;

  notifyListeners();
}

// 设置当前用户
export function setCurrentUser(user: MemberInfo | null): void {
  appState.currentUser = user;

  notifyListeners();
}

// 订阅状态变化
export function subscribeAppState(listener: () => void): () => void {
  listeners.push(listener);

  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

function notifyListeners(): void {
  listeners.forEach((listener) => listener());
}
