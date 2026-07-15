import { useCallback, useEffect, useRef } from "react";

interface CharacterControlsOptions {
  enabled: boolean;
  onInteract: () => void;
}

interface DirectionVector {
  x: number;
  z: number;
}

const MOVEMENT_KEYS: Record<string, DirectionVector> = {
  w: { x: 0, z: -1 },
  arrowup: { x: 0, z: -1 },
  s: { x: 0, z: 1 },
  arrowdown: { x: 0, z: 1 },
  a: { x: -1, z: 0 },
  arrowleft: { x: -1, z: 0 },
  d: { x: 1, z: 0 },
  arrowright: { x: 1, z: 0 },
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable;
}

/**
 * Kontrol karakter: keyboard (WASD + arrow) digabung virtual joystick.
 * Arah dibaca lewat ref setiap frame — tanpa re-render React per input.
 */
export function useCharacterControls({ enabled, onInteract }: CharacterControlsOptions) {
  const pressedKeys = useRef<Set<string>>(new Set());
  const joystick = useRef<DirectionVector>({ x: 0, z: 0 });
  const interactRef = useRef(onInteract);
  interactRef.current = onInteract;

  useEffect(() => {
    const keys = pressedKeys.current;
    if (!enabled) {
      keys.clear();
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (isTypingTarget(event.target)) return;
      const key = event.key.toLowerCase();

      if (key === "e") {
        interactRef.current();
        return;
      }

      if (MOVEMENT_KEYS[key]) {
        event.preventDefault();
        keys.add(key);
      }
    }

    function onKeyUp(event: KeyboardEvent) {
      keys.delete(event.key.toLowerCase());
    }

    function onBlur() {
      keys.clear();
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      keys.clear();
    };
  }, [enabled]);

  const getDirection = useCallback((): DirectionVector => {
    let x = joystick.current.x;
    let z = joystick.current.z;

    pressedKeys.current.forEach((key) => {
      const vector = MOVEMENT_KEYS[key];
      if (vector) {
        x += vector.x;
        z += vector.z;
      }
    });

    const length = Math.hypot(x, z);
    if (length <= 0.01) return { x: 0, z: 0 };
    const scale = Math.min(1, length) / length;
    return { x: x * scale, z: z * scale };
  }, []);

  const setJoystick = useCallback((x: number, z: number) => {
    joystick.current = { x, z };
  }, []);

  return { getDirection, setJoystick };
}
