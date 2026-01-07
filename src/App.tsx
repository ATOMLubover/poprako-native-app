import { useState, useEffect } from "react";
import PanelView from "./views/PanelView";
import LoginView from "./views/Login/LoginView";
import TitleBar from "./components/TitleBar";
import "./App.css";
import { ToastProvider } from "./components/NotificationToast";
import { getAppState, subscribeAppState } from "./store/app";

function App() {
  const [currentView, setCurrentView] = useState(getAppState().view);

  useEffect(() => {
    const unsubscribe = subscribeAppState(() => {
      setCurrentView(getAppState().view);
    });

    return unsubscribe;
  }, []);

  return (
    <ToastProvider>
      <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
        <TitleBar />
        <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
          {currentView === "login" && <LoginView />}
          {currentView === "panel" && <PanelView />}
        </div>
      </div>
    </ToastProvider>
  );
}

export default App;
