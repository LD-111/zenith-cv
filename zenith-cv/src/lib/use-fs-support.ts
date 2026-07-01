"use client";
import { useState, useEffect, startTransition } from "react";

export function isFsSupported(): boolean {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export function useFsSupport(): { supported: boolean; checked: boolean } {
  const [checked, setChecked] = useState(false);
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    startTransition(() => {
      setSupported(isFsSupported());
      setChecked(true);
    });
  }, []);

  return { supported, checked };
}
