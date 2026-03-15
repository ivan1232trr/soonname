import type { ReactNode } from "react";
import BottomNav from "@/components/BottomNav";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="shell">
      {children}
      <BottomNav />
    </div>
  );
}
