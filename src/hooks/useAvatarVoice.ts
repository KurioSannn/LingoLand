import { useCallback, useEffect, useRef, useState } from "react";

// Wraps the browser's built-in Web Speech Synthesis API (text-to-speech, the
// output counterpart to the SpeechRecognition input already used in World's
// ConversationPanel). No backend, no API key, no cost — but voice quality and
// language coverage depend entirely on the user's browser/OS.
export function useAvatarVoice() {
  const isSupported = typeof window !== "undefined" && "speechSynthesis" in window;
  const [isSpeaking, setIsSpeaking] = useState(false);
  // Off by default — audio should only play once the user explicitly opts in
  // via the mute/unmute icon, not autoplay the moment a reply arrives.
  const [isEnabled, setIsEnabled] = useState(false);
  const isEnabledRef = useRef(isEnabled);
  isEnabledRef.current = isEnabled;

  const stop = useCallback(() => {
    if (isSupported) window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, [isSupported]);

  const speak = useCallback((text: string) => {
    if (!isSupported || !isEnabledRef.current) return;
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }, [isSupported]);

  useEffect(() => stop, [stop]);

  function toggleEnabled() {
    setIsEnabled((current) => {
      if (current) stop();
      return !current;
    });
  }

  return { isSupported, isSpeaking, isEnabled, toggleEnabled, speak, stop };
}
