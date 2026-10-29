export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Serve static assets
    if (url.pathname !== "/tts") {
      return env.ASSETS.fetch(request);
    }

    // Only allow POST for TTS
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    try {
      const { text } = await request.json();
      if (!text || typeof text !== "string") {
        return new Response(JSON.stringify({ error: "Missing text" }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }

      const apiKey = env.FISH_API_KEY;
      if (!apiKey) {
        return new Response(JSON.stringify({ error: "FISH_API_KEY secret not set" }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }

      const modelId = env.FISH_MODEL_ID || "0089dce5fefb4c6ba9b9f2f0debe1ddc";

      const modelHeader = env.FISH_MODEL_HEADER || "s2.1-pro-free";

      const fishRes = await fetch("https://api.fish.audio/v1/tts", {
        method: "POST",
        headers: {
          "Authorization": "Bearer " + apiKey,
          "Content-Type": "application/json",
          "model": modelHeader
        },
        body: JSON.stringify({
          text: text,
          reference_id: modelId,
          format: "mp3"
        })
      });

      if (!fishRes.ok) {
        const errText = await fishRes.text();
        return new Response(JSON.stringify({ 
          error: "Fish Audio error", 
          status: fishRes.status,
          detail: errText 
        }), {
          status: fishRes.status,
          headers: { "Content-Type": "application/json" }
        });
      }

      // Stream the audio back
      return new Response(fishRes.body, {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Cache-Control": "no-store"
        }
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message || "TTS failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  }
};
