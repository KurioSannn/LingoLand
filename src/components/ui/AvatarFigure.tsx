import { avatarOptions } from "../../data/demoData";
import type { AvatarConfig } from "../../types";

function colorFor(id: string | null): string {
  return avatarOptions.find((option) => option.id === id)?.color ?? "#7868F8";
}

const sizePx: Record<"small" | "medium" | "large", number> = {
  small: 48,
  medium: 64,
  large: 96,
};

export function AvatarFigure({ avatar, size = "medium", label }: { avatar: AvatarConfig; size?: "small" | "medium" | "large"; label?: string }) {
  return (
    <div
      className={`avatar-figure avatar-figure-${size}`}
      style={{ height: sizePx[size], width: sizePx[size] }}
      aria-label={label ?? "Avatar"}
    >
      <span className="avatar-head" style={{ background: colorFor(avatar.skinToneId) }}>
        <span className="avatar-hair" style={{ background: colorFor(avatar.hairId) }} />
        {avatar.accessoryId === "accessory-round-glasses" ? <span className="avatar-glasses" /> : null}
        {avatar.accessoryId === "accessory-mini-home-cap" ? <span className="avatar-cap" /> : null}
      </span>
      <span className="avatar-body" style={{ background: colorFor(avatar.topId) }} />
      <span className="avatar-legs" style={{ background: colorFor(avatar.bottomId) }} />
      <span className="avatar-shoes" style={{ background: colorFor(avatar.shoesId) }} />
    </div>
  );
}
