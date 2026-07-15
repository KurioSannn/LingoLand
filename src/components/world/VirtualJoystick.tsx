import { useRef, useState } from "react";
import type { PointerEvent } from "react";

interface VirtualJoystickProps {
  onChange: (x: number, z: number) => void;
}

const RADIUS = 52;
const KNOB_TRAVEL = 34;
const DEAD_ZONE = 0.18;

/** Joystick sentuh untuk mobile: drag knob, lepas untuk berhenti. */
export function VirtualJoystick({ onChange }: VirtualJoystickProps) {
  const baseRef = useRef<HTMLDivElement>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(false);

  function updateFromPointer(event: PointerEvent<HTMLDivElement>) {
    const base = baseRef.current;
    if (!base) return;

    const rect = base.getBoundingClientRect();
    const rawX = event.clientX - (rect.left + rect.width / 2);
    const rawY = event.clientY - (rect.top + rect.height / 2);
    const length = Math.hypot(rawX, rawY);
    const clampedLength = Math.min(length, RADIUS);
    const angleX = length > 0 ? rawX / length : 0;
    const angleY = length > 0 ? rawY / length : 0;

    setKnob({ x: angleX * Math.min(clampedLength, KNOB_TRAVEL), y: angleY * Math.min(clampedLength, KNOB_TRAVEL) });

    const magnitude = clampedLength / RADIUS;
    if (magnitude < DEAD_ZONE) {
      onChange(0, 0);
      return;
    }
    onChange(angleX * magnitude, angleY * magnitude);
  }

  function release() {
    setIsActive(false);
    setKnob({ x: 0, y: 0 });
    onChange(0, 0);
  }

  return (
    <div
      ref={baseRef}
      className={`joystick ${isActive ? "joystick-active" : ""}`.trim()}
      role="application"
      aria-label="Joystick gerakan karakter"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        setIsActive(true);
        updateFromPointer(event);
      }}
      onPointerMove={(event) => {
        if (isActive) updateFromPointer(event);
      }}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <span className="joystick-knob" style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} />
    </div>
  );
}
