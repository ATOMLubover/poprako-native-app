import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import "./NotificationToast.css";

type ToastType = "success" | "error" | "info";

type Toast = {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
};

type ToastContextValue = {
  showToast: (type: ToastType, message: string, duration?: number) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export const ToastProvider: React.FC<React.PropsWithChildren<{}>> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((type: ToastType, message: string, duration = 3000) => {
    const id = uid();
    const toast: Toast = { id, type, message, duration };

    setToasts((prev) => [...prev, toast]);

    window.setTimeout(() => {
      // start hiding then remove after animation
      const el = document.getElementById(`toast-${id}`);
      if (el) {
        el.classList.add("hiding");
        el.addEventListener("animationend", () => {
          removeToast(id);
        });
      } else {
        removeToast(id);
      }
    }, duration);
  }, [removeToast]);

  const contextValue = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className="toast-container" aria-live="polite" aria-atomic="true">
        {toasts.map((t) => (
          <div key={t.id} id={`toast-${t.id}`} className={`toast toast-${t.type}`}>
            <span className="toast-message">{t.message}</span>
            <button
              className="toast-close"
              onClick={() => {
                const el = document.getElementById(`toast-${t.id}`);
                if (el) {
                  el.classList.add("hiding");
                  el.addEventListener("animationend", () => {
                    removeToast(t.id);
                  });
                } else {
                  removeToast(t.id);
                }
              }}
            >
              ×
            </button>
            <div className="toast-progress">
              <div
                className="toast-progress-bar"
                style={{ transition: `transform ${t.duration}ms linear`, transform: "scaleX(0)" }}
              />
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}

export default ToastProvider;
