import Link from "next/link";

type TeacherRoomNavProps = {
  roomId: string;
  active?: "home" | "shop" | "art" | "report" | "approve";
  pendingApprovals?: number;
};

const items = [
  { id: "home", path: "", label: "평가", icon: "✏️" },
  { id: "shop", path: "/shop", label: "상점", icon: "🎁" },
  { id: "art", path: "/art", label: "아트", icon: "🖼️" },
  { id: "report", path: "/report", label: "진척", icon: "📊" },
  { id: "approve", path: "/approve", label: "승인", icon: "✅" },
] as const;

export function TeacherRoomNav({
  roomId,
  active = "home",
  pendingApprovals = 0,
}: TeacherRoomNavProps) {
  return (
    <nav className="room-nav room-nav--5" aria-label="방 메뉴">
      {items.map((item) => {
        const href = `/room/${roomId}${item.path}`;
        const isActive = item.id === active;
        return (
          <Link
            key={item.id}
            href={href}
            className={`room-nav__item${isActive ? " is-active" : ""}`}
            aria-current={isActive ? "page" : undefined}
          >
            <span aria-hidden="true">{item.icon}</span>
            <strong>{item.label}</strong>
            {item.id === "approve" && pendingApprovals > 0 ? (
              <em className="room-nav__badge">{pendingApprovals}</em>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
