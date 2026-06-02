"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckIcon, AlertIcon, CloseIcon } from "./Icons";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4000);
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Portal/Container */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between p-4 rounded-xl border shadow-lg transform transition-all duration-300 translate-y-0 scale-100 animate-slide-in ${
              toast.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : toast.type === "error"
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : "bg-blue-50 border-blue-200 text-blue-800"
            }`}
          >
            <div className="flex items-center gap-3">
              {toast.type === "success" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <CheckIcon size={18} />
                </div>
              )}
              {toast.type === "error" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
                  <AlertIcon size={18} />
                </div>
              )}
              {toast.type === "info" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <AlertIcon size={18} />
                </div>
              )}
              <p className="text-sm font-medium leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className={`ml-4 p-1 rounded-lg hover:bg-black/5 transition-colors cursor-pointer ${
                toast.type === "success"
                  ? "text-emerald-500 hover:text-emerald-700"
                  : toast.type === "error"
                  ? "text-rose-500 hover:text-rose-700"
                  : "text-blue-500 hover:text-blue-700"
              }`}
            >
              <CloseIcon size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
};
