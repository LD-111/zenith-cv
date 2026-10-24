"use client";

import { useEffect } from "react";
import { hasUndownloadedVirtualCVs } from "@/lib/virtual-store";

export function LeaveGuard() {
  useEffect(() => {
    const onLeave = (e: BeforeUnloadEvent) => {
      if (!hasUndownloadedVirtualCVs()) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, []);
  return null;
}
