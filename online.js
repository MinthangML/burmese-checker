import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import {
  SUPABASE_ANON_KEY,
  SUPABASE_URL,
  hasSupabaseConfig,
  supabase,
} from "./supabaseClient";

const ONLINE_SESSION_KEY = "burmese-checker-online-session-v1";

export class OnlineMatchError extends Error {
  constructor(message, code = "online_error", data = null) {
    super(message);
    this.name = "OnlineMatchError";
    this.code = code;
    this.data = data;
  }
}

function assertSupabaseConfig() {
  if (!hasSupabaseConfig || !supabase) {
    throw new OnlineMatchError(
      "Add your Supabase URL and anon key to .env before starting an online match.",
      "missing_config"
    );
  }
}

function buildSession(data, currentSession = null) {
  return {
    matchId: data.matchId ?? currentSession?.matchId,
    roomCode: data.roomCode ?? currentSession?.roomCode,
    color: data.color ?? currentSession?.color,
    playerToken: data.playerToken ?? currentSession?.playerToken,
    realtimeTopic: data.realtimeTopic ?? currentSession?.realtimeTopic,
  };
}

async function invokeMatchFunction(functionName, body) {
  assertSupabaseConfig();

  let response;
  let payload = null;
  let responseText = "";

  try {
    response = await fetch(`${SUPABASE_URL}/functions/v1/${functionName}`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body ?? {}),
    });
    responseText = await response.text();
  } catch (error) {
    throw new OnlineMatchError(
      formatNetworkError(error),
      "network_error",
      error
    );
  }

  if (responseText) {
    try {
      payload = JSON.parse(responseText);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    throw new OnlineMatchError(
      payload?.message ??
        responseText ??
        `Online backend returned HTTP ${response.status}.`,
      payload?.code ?? `http_${response.status}`,
      {
        status: response.status,
        body: payload ?? responseText,
      }
    );
  }

  if (!payload?.ok) {
    throw new OnlineMatchError(
      payload?.message ?? "Online match request failed.",
      payload?.code ?? "online_error",
      payload
    );
  }

  return payload;
}

function formatNetworkError(error) {
  return error?.message
    ? `Could not reach the online backend: ${error.message}`
    : "Could not reach the online backend.";
}

function getWebStorage() {
  if (Platform.OS !== "web" || typeof globalThis?.localStorage === "undefined") {
    return null;
  }

  return globalThis.localStorage;
}

async function canUseSecureStore() {
  if (Platform.OS === "web") {
    return false;
  }

  try {
    return await SecureStore.isAvailableAsync();
  } catch {
    return false;
  }
}

export function normalizeRoomCode(value) {
  return value.replace(/[^a-z0-9]/gi, "").toUpperCase().slice(0, 6);
}

export async function saveOnlineSession(session) {
  const payload = JSON.stringify(session);
  const webStorage = getWebStorage();

  if (webStorage) {
    webStorage.setItem(ONLINE_SESSION_KEY, payload);
    return;
  }

  if (await canUseSecureStore()) {
    await SecureStore.setItemAsync(ONLINE_SESSION_KEY, payload);
  }
}

export async function loadSavedOnlineSession() {
  const webStorage = getWebStorage();
  let payload = null;

  if (webStorage) {
    payload = webStorage.getItem(ONLINE_SESSION_KEY);
  } else if (await canUseSecureStore()) {
    payload = await SecureStore.getItemAsync(ONLINE_SESSION_KEY);
  }

  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(payload);
  } catch {
    await clearSavedOnlineSession();
    return null;
  }
}

export async function clearSavedOnlineSession() {
  const webStorage = getWebStorage();

  if (webStorage) {
    webStorage.removeItem(ONLINE_SESSION_KEY);
    return;
  }

  if (await canUseSecureStore()) {
    await SecureStore.deleteItemAsync(ONLINE_SESSION_KEY);
  }
}

export async function createOnlineMatch() {
  const data = await invokeMatchFunction("create-match", {});
  return {
    session: buildSession(data),
    state: data.state,
  };
}

export async function joinOnlineMatch(roomCode) {
  const data = await invokeMatchFunction("join-match", {
    roomCode: normalizeRoomCode(roomCode),
  });

  return {
    session: buildSession(data),
    state: data.state,
  };
}

export async function getOnlineMatch(session) {
  const data = await invokeMatchFunction("get-match", {
    matchId: session.matchId,
    playerToken: session.playerToken,
  });

  return {
    session: buildSession(data, session),
    state: data.state,
  };
}

export async function submitOnlineMove(session, state, move) {
  const data = await invokeMatchFunction("submit-move", {
    matchId: session.matchId,
    playerToken: session.playerToken,
    expectedMoveNumber: state?.moveNumber ?? 0,
    move,
  });

  return {
    session: buildSession(data, session),
    state: data.state,
  };
}

export async function submitOnlineMatchAction(session, state, action) {
  const data = await invokeMatchFunction("submit-match-action", {
    matchId: session.matchId,
    playerToken: session.playerToken,
    expectedMoveNumber: state?.moveNumber ?? 0,
    action,
  });

  return {
    session: buildSession(data, session),
    state: data.state,
  };
}

export function subscribeToOnlineMatch(
  session,
  { onState, onPresence, onStatus, onError }
) {
  if (!supabase || !session?.realtimeTopic) {
    return () => {};
  }

  const channel = supabase.channel(session.realtimeTopic, {
    config: {
      presence: { key: session.color },
      broadcast: { ack: false },
    },
  });

  channel
    .on("broadcast", { event: "match_state" }, ({ payload }) => {
      if (payload?.type === "match_state" && payload.state) {
        onState?.(payload.state);
      }
    })
    .on("presence", { event: "sync" }, () => {
      onPresence?.(channel.presenceState());
    })
    .subscribe(async (status, error) => {
      onStatus?.(status);

      if (error) {
        onError?.(error);
      }

      if (status === "SUBSCRIBED") {
        try {
          await channel.track({
            color: session.color,
            connectedAt: new Date().toISOString(),
          });
        } catch (trackError) {
          onError?.(trackError);
        }
      }
    });

  return () => {
    channel.untrack().catch(() => {});
    supabase.removeChannel(channel).catch(() => {});
  };
}
