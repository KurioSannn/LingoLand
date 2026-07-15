interface FriendAvatarProps {
  name: string;
  color: string;
  online: boolean;
  size?: "small" | "large";
}

export function FriendAvatar({ name, color, online, size = "small" }: FriendAvatarProps) {
  return (
    <span className={`friend-avatar ${size === "large" ? "friend-avatar-large" : ""}`.trim()} style={{ backgroundColor: color }} aria-hidden>
      {name.charAt(0).toUpperCase()}
      <span className={`online-dot ${online ? "online-dot-active" : ""}`.trim()} />
    </span>
  );
}
