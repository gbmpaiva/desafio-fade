"use client";

import { useEffect, useState } from "react";

async function initMocks() {
  if (typeof window === "undefined") return;

  const { worker } = await import("./browser");

  await worker.start({
    // Only warn about unhandled requests, don't throw
    onUnhandledRequest: "warn",
    serviceWorker: {
      url: "/mockServiceWorker.js",
    },
  });
}

let initialized = false;

export function MSWProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (initialized) {
      Promise.resolve().then(() => setReady(true));
      return;
    }

    initMocks().then(() => {
      initialized = true;
      setReady(true);
    });
  }, []);

  // Block render until the Service Worker is registered
  // to avoid any real network requests before MSW is ready
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
          <p className="text-sm text-gray-500">Iniciando ambiente de desenvolvimento...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
