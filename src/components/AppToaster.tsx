"use client";

import { usePathname } from "next/navigation";
import { Toaster } from "@/components/ui/sonner";

export function AppToaster() {
  const pathname = usePathname();
  return <Toaster theme={pathname.startsWith("/admin") ? "dark" : "light"} />;
}
