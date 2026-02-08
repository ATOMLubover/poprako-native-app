import PanelView from "./views/PanelView";
import TitleBar from "./components/TitleBar";
import "./App.css";
import { ToastProvider } from "./components/NotificationToast";

// 离线版本直接进入主面板，无登录流程
function App() {
  return (
    <ToastProvider>
      <div
        style={{ height: "100vh", display: "flex", flexDirection: "column" }}
      >
        <TitleBar />
        <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          <PanelView />
        </div>
      </div>
    </ToastProvider>
  );
}

export default App;
