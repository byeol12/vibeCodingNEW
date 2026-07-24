import Link from "next/link";

const tabs = [
  { id: "home", href: "/me", label: "홈", icon: "🏠" },
  { id: "dex", href: "/me/dex", label: "보관함", icon: "🃏" },
  { id: "shop", href: "/me/shop", label: "상점", icon: "🎁" },
  { id: "stats", href: "/me/stats", label: "성장", icon: "📈" },
] as const;

export type StudentTabId = (typeof tabs)[number]["id"];

type StudentTabBarProps = {
  active: StudentTabId;
};

export function StudentTabBar({ active }: StudentTabBarProps) {
  return (
    <>
      <div className="student-tabbar-spacer" aria-hidden="true" />
      <nav className="student-tabbar" aria-label="학생 메뉴">
        {tabs.map((tab) => {
          const isActive = tab.id === active;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              className={isActive ? "is-active" : undefined}
              aria-current={isActive ? "page" : undefined}
            >
              <span className="student-tabbar__icon" aria-hidden="true">
                {tab.icon}
              </span>
              <strong>{tab.label}</strong>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
