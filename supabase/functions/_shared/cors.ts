export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

export function handleOptions(request: Request) {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse(
      {
        ok: false,
        code: "method_not_allowed",
        message: "Use POST for this endpoint.",
      },
      405
    );
  }

  return null;
}

export function setupAwareError(error: unknown, fallbackMessage: string) {
  const maybeError = error as { code?: string; message?: string };

  if (maybeError?.code === "42P01") {
    return {
      ok: false,
      code: "database_not_ready",
      message:
        "Online database tables are missing. Run `supabase db push`, then deploy the Edge Functions again.",
    };
  }

  if (maybeError?.code === "42883") {
    return {
      ok: false,
      code: "database_function_missing",
      message:
        "An online match database function is missing. Run `supabase db push` before playing online.",
    };
  }

  if (maybeError?.code === "42501") {
    return {
      ok: false,
      code: "database_permission_denied",
      message:
        "The Edge Function could not access the online tables. Re-run `supabase db push` to apply grants.",
    };
  }

  return {
    ok: false,
    code: "server_error",
    message: maybeError?.message ?? fallbackMessage,
  };
}
