import "@supabase/functions-js/edge-runtime.d.ts";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

export default {
  fetch: async (req: Request) => {
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        },
      });
    }

    try {
      const { model, max_tokens, system, messages } = await req.json();

      const apiKey = Deno.env.get("ANTHROPIC_API_KEY");

      if (!apiKey) {
        return Response.json({ error: "API key not configured" }, { status: 500 });
      }

      const response = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({ model, max_tokens, system, messages }),
      });

      const data = await response.json();

      return Response.json(data, {
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      });

    } catch (err) {
      return Response.json({ error: err.message }, { status: 500 });
    }
  },
};