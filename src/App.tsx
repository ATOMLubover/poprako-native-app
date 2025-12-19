import PanelView from "./views/PanelView";
import "./App.css";
import { ToastProvider } from "./components/NotificationToast";

function App() {
  return (
    <ToastProvider>
      <PanelView />
    </ToastProvider>
  );
}

export default App;
