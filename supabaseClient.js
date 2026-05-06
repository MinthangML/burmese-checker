import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";

const env = typeof process !== "undefined" ? process.env : {};

export const SUPABASE_URL = (env.EXPO_PUBLIC_SUPABASE_URL ?? "").replace(
  /\/+$/,
  ""
);
export const SUPABASE_ANON_KEY = env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const hasSupabaseConfig =
  SUPABASE_URL.startsWith("https://") &&
  SUPABASE_ANON_KEY.length > 20 &&
  !SUPABASE_URL.includes("your-project-ref") &&
  !SUPABASE_ANON_KEY.includes("your-supabase");

export const supabase = hasSupabaseConfig
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  : null;
