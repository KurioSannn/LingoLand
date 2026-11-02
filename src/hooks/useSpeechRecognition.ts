import { useState } from "react";

export type MicStatus = "idle" | "listening" | "unsupported" | "denied";

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  start: () => void;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
  onerror: (() => void) | null;
}

// Web Speech API input (speech-to-text), shared by World's ConversationPanel
// (mission NPCs) and AvatarChatPage (free chat). Result always lands in the
// caller's text input rather than auto-sending, so the user still confirms
// with Kirim — matches PRD: "pengguna tetap menekan kirim".
export function useSpeechRecognition(onResult: (transcript: string) => void) {
  const [micStatus, setMicStatus] = useState<MicStatus>("idle");

  function startSpeechRecognition() {
    const SpeechApi = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!SpeechApi) {
      setMicStatus("unsupported");
      return;
    }

    try {
      const recognition = new SpeechApi() as SpeechRecognitionLike;
      recognition.lang = "en-US";
      recognition.interimResults = false;
      recognition.onresult = (event) => {
        onResult(event.results[0][0].transcript);
        setMicStatus("idle");
      };
      recognition.onerror = () => setMicStatus("denied");
      setMicStatus("listening");
      recognition.start();
    } catch {
      setMicStatus("denied");
    }
  }

  return { micStatus, startSpeechRecognition };
}
