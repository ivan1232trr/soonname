interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

const base = (content: React.ReactNode, size: number, color: string, sw: number) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {content}
  </svg>
);

export const IconHouse = ({ size = 18, color = "currentColor", strokeWidth = 2 }: IconProps) =>
  base(<><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>, size, color, strokeWidth);

export const IconMap = ({ size = 18, color = "currentColor", strokeWidth = 2 }: IconProps) =>
  base(<><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" /><line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" /></>, size, color, strokeWidth);

export const IconPlus = ({ size = 18, color = "currentColor", strokeWidth = 2 }: IconProps) =>
  base(<><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>, size, color, strokeWidth);

export const IconUser = ({ size = 18, color = "currentColor", strokeWidth = 2 }: IconProps) =>
  base(<><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>, size, color, strokeWidth);

export const IconSearch = ({ size = 18, color = "currentColor", strokeWidth = 2 }: IconProps) =>
  base(<><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></>, size, color, strokeWidth);

export const IconHeart = ({ size = 18, color = "currentColor", strokeWidth = 2 }: IconProps) =>
  base(<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />, size, color, strokeWidth);

export const IconMapPin = ({ size = 16, color = "currentColor", strokeWidth = 2 }: IconProps) =>
  base(<><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></>, size, color, strokeWidth);

export const IconCalendar = ({ size = 18, color = "currentColor", strokeWidth = 2 }: IconProps) =>
  base(<><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>, size, color, strokeWidth);

export const IconClock = ({ size = 18, color = "currentColor", strokeWidth = 2 }: IconProps) =>
  base(<><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16.5 12" /></>, size, color, strokeWidth);

export const IconChevronLeft = ({ size = 24, color = "currentColor", strokeWidth = 2 }: IconProps) =>
  base(<polyline points="15 18 9 12 15 6" />, size, color, strokeWidth);

export const IconChevronDown = ({ size = 18, color = "currentColor", strokeWidth = 2 }: IconProps) =>
  base(<polyline points="6 9 12 15 18 9" />, size, color, strokeWidth);

export const IconShare = ({ size = 20, color = "currentColor", strokeWidth = 2 }: IconProps) =>
  base(<><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" /></>, size, color, strokeWidth);

export const IconSend = ({ size = 18, color = "currentColor", strokeWidth = 2 }: IconProps) =>
  base(<><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></>, size, color, strokeWidth);

export const IconNavigation = ({ size = 16, color = "currentColor", strokeWidth = 2 }: IconProps) =>
  base(<polygon points="3 11 22 2 13 21 11 13 3 11" />, size, color, strokeWidth);

export const IconSparkles = ({ size = 16, color = "currentColor", strokeWidth = 2 }: IconProps) =>
  base(<><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" /><path d="M5 3l.75 2.25L8 6l-2.25.75L5 9l-.75-2.25L2 6l2.25-.75L5 3z" /><path d="M19 12l.75 2.25L22 15l-2.25.75L19 18l-.75-2.25L16 15l2.25-.75L19 12z" /></>, size, color, strokeWidth);

export const IconCheck = ({ size = 40, color = "currentColor", strokeWidth = 2.5 }: IconProps) =>
  base(<polyline points="20 6 9 17 4 12" />, size, color, strokeWidth);

export const IconCoffee = ({ size = 28, color = "currentColor", strokeWidth = 2 }: IconProps) =>
  base(<><path d="M18 8h1a4 4 0 0 1 0 8h-1" /><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z" /><line x1="6" y1="1" x2="6" y2="4" /><line x1="10" y1="1" x2="10" y2="4" /><line x1="14" y1="1" x2="14" y2="4" /></>, size, color, strokeWidth);

export const IconZap = ({ size = 28, color = "currentColor", strokeWidth = 2 }: IconProps) =>
  base(<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />, size, color, strokeWidth);

export const IconSunrise = ({ size = 24, color = "currentColor", strokeWidth = 2 }: IconProps) =>
  base(<><path d="M17 18a5 5 0 0 0-10 0" /><line x1="12" y1="2" x2="12" y2="9" /><line x1="4.22" y1="10.22" x2="5.64" y2="11.64" /><line x1="1" y1="18" x2="3" y2="18" /><line x1="21" y1="18" x2="23" y2="18" /><line x1="18.36" y1="11.64" x2="19.78" y2="10.22" /><polyline points="8 6 12 2 16 6" /></>, size, color, strokeWidth);

export const IconSun = ({ size = 24, color = "currentColor", strokeWidth = 2 }: IconProps) =>
  base(<><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" /></>, size, color, strokeWidth);

export const IconSunset = ({ size = 24, color = "currentColor", strokeWidth = 2 }: IconProps) =>
  base(<><path d="M17 18a5 5 0 0 0-10 0" /><line x1="12" y1="9" x2="12" y2="2" /><line x1="4.22" y1="10.22" x2="5.64" y2="11.64" /><line x1="1" y1="18" x2="3" y2="18" /><line x1="21" y1="18" x2="23" y2="18" /><line x1="18.36" y1="11.64" x2="19.78" y2="10.22" /><polyline points="16 5 12 9 8 5" /></>, size, color, strokeWidth);

export const IconMoon = ({ size = 24, color = "currentColor", strokeWidth = 2 }: IconProps) =>
  base(<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />, size, color, strokeWidth);

export const IconX = ({ size = 18, color = "currentColor", strokeWidth = 2 }: IconProps) =>
  base(<><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>, size, color, strokeWidth);

export const IconMegaphone = ({ size = 18, color = "currentColor", strokeWidth = 2 }: IconProps) =>
  base(<><path d="M3 11l19-9-9 19-2-8-8-2z" /></>, size, color, strokeWidth);

export const IconPencil = ({ size = 16, color = "currentColor", strokeWidth = 2 }: IconProps) =>
  base(<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></>, size, color, strokeWidth);

export const IconRefreshCw = ({ size = 16, color = "currentColor", strokeWidth = 2 }: IconProps) =>
  base(<><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></>, size, color, strokeWidth);
