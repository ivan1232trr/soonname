"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconHouse, IconMap, IconPlus, IconMegaphone, IconUser } from "./icons";
import styles from "./BottomNav.module.css";

const tabs = [
  { href: "/", label: "FEED", Icon: IconHouse },
  { href: "/map", label: "MAP", Icon: IconMap },
  { href: "/post", label: "", Icon: IconPlus, isPrimary: true },
  { href: "/announcements", label: "Announcements", Icon: IconMegaphone },
  { href: "/profile", label: "PROFILE", Icon: IconUser },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className={styles.nav}>
      <div className={styles.pill}>
        {tabs.map(({ href, label, Icon, isPrimary }) => {
          const isActive = pathname === href;
          if (isPrimary) {
            return (
              <Link key={href} href={href} className={styles.tab}>
                <div className={styles.plusBtn}>
                  <Icon size={18} color="#ffffff" />
                </div>
              </Link>
            );
          }
          return (
            <Link key={href} href={href} className={`${styles.tab} ${isActive ? styles.activeTab : ""}`}>
              <Icon size={18} color={isActive ? "#ffffff" : "var(--cp-text-muted)"} />
              <span className={`${styles.label} ${isActive ? styles.activeLabel : ""}`}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
