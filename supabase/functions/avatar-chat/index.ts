// Supabase Edge Function: proxies free-form avatar chat to Gemini.
//
// Why this exists as a proxy instead of calling Gemini straight from the
// browser: Lingoland's frontend is a static SPA with no server of its own.
// A Gemini API key baked into a VITE_* env var would ship inside the public
// JS bundle, where anyone can read it and burn your quota. This function
// keeps the key server-side as a Supabase secret instead.
//
// To (re)activate after changing this file:
//   supabase secrets set GEMINI_API_KEY=your-key-here   (only needed once)
//   supabase functions deploy avatar-chat                (needed on every code change)
// If GEMINI_API_KEY isn't set yet, src/lib/avatarChatClient.ts falls back to
// an honest "belum aktif" message instead of pretending this is live (see
// PRD: "jangan mengklaim bahwa ... AI sudah tersedia").

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_MODEL = "gemini-2.5-flash";

const SYSTEM_PROMPT = `You are a friendly English-speaking practice companion inside Lingoland,
an app that helps nervous beginners practice speaking English without fear of judgment.
Reply in simple, encouraging English (CEFR A2-B1 level). Keep replies short (1-3 sentences).
Gently correct obvious mistakes by modeling the correct phrase, without being harsh or
academic. Never claim to be a real human or a certified teacher. Never discuss topics
unrelated to casual conversation practice.`;

interface ChatMessage {
  role: "user" | "model";
  content: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: "GEMINI_API_KEY belum diset sebagai Supabase secret." }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const { messages } = (await req.json()) as { messages: ChatMessage[] };
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "Payload harus berisi array 'messages'." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const requestBody = JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: messages.map((message) => ({
        role: message.role,
        parts: [{ text: message.content }],
      })),
    });

    async function callGemini() {
      return fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: requestBody },
      );
    }

    let geminiResponse = await callGemini();

    // Gemini's free-tier flash models occasionally return 503 "high demand" —
    // that's Google's capacity, not our request. One retry after a short
    // pause clears most of these without the user having to resend manually.
    if (geminiResponse.status === 503) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      geminiResponse = await callGemini();
    }

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      return new Response(
        JSON.stringify({ error: `Gemini API error: ${errorText}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await geminiResponse.json();
    const reply: string = data.candidates?.[0]?.content?.parts?.[0]?.text
      ?? "Sorry, I could not think of a reply. Can you try rephrasing that?";

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: `Request tidak valid: ${String(error)}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
