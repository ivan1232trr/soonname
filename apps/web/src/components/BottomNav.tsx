// AI-GENERATED
// Tool: Claude (claude-sonnet-4-6)
// Date: 2026-03-15
// Prompt summary: Bottom navigation component for mobile-first layout with active state highlighting
// Reviewed by: unreviewed

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconHouse, IconMap, IconPlus, IconMegaphone, IconUser } from "./icons";
import styles from "./BottomNav.module.css";

/**
 * Defines the navigation tabs available in the bottom bar.
 * Each tab includes a destination href, display label, and an associated icon component.
 */
const tabs = [
  { href: "/", label: "FEED", Icon: IconHouse },
  { href: "/map", label: "MAP", Icon: IconMap },
  { href: "/post", label: "", Icon: IconPlus, isPrimary: true },
  { href: "/announcements", label: "Announcements", Icon: IconMegaphone },
  { href: "/profile", label: "PROFILE", Icon: IconUser },
];

/**
 * BottomNav Component
 * 
 * Renders a fixed navigation bar at the bottom of the viewport.
 * Uses the Next.js pathname to highlight the current active route.
 * 
 * @returns - A navigation component with tab links
 */
export default function BottomNav() {
  // Retrieve the current URL path to identify which tab is active
  const pathname = usePathname();

  return (
    <nav className={styles.nav}>
      {/* Container pill for the navigation items, centered and styled via CSS modules */}
      <div className={styles.pill}>
        {/* Iterate over the defined tabs to render navigation links dynamically */}
        {tabs.map(({ href, label, Icon, isPrimary }) => {
          // Check if the current route matches the tab's destination to apply active styles
          const isActive = pathname === href;

          // Primary action (e.g., Plus button) has a unique centered, elevated style
          if (isPrimary) {
            return (
              <Link key={href} href={href} className={styles.tab}>
                {/* Visual container for the primary action button icon */}
                <div className={styles.plusBtn}>
                  {/* Plus icon is fixed to white to ensure contrast on the primary color bagkround */}
                  <Icon size={18} color="#ffffff" />
                </div>
              </Link>
            );
          }

          // Standard navigation tabs with label and icon
          return (
            <Link key={href} href={href} className={`${styles.tab} ${isActive ? styles.activeTab : ""}`}>
              {/* Icon color changes based on whether the tab is currently active */}
              <Icon size={18} color={isActive ? "#ffffff" : "var(--cp-text-muted)"} />
              {/* Text label visibility or styling changes depending on the active state */}
              <span className={`${styles.label} ${isActive ? styles.activeLabel : ""}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
