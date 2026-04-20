"use client";

import { useEffect, useState } from "react";

export function SplashScreen() {
  const [fading, setFading] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("splash-shown")) return;
    sessionStorage.setItem("splash-shown", "1");
    setVisible(true);

    const fadeTimer = setTimeout(() => setFading(true), 500);
    const hideTimer = setTimeout(() => setVisible(false), 800);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-2 transition-opacity duration-300"
      style={{ backgroundColor: "#d576af", opacity: fading ? 0 : 1 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/icon-192x192.png" alt="" width={32} height={32} />
      <span className="text-white font-medium text-lg tracking-wide">Noter</span>
    </div>
  );
}
