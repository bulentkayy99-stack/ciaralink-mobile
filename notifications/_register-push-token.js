// POST /api/register-push-token
//
// Registers (upserts) a device's APNs/FCM push token against the signed-in
// CiaraLink user so the backend can target pushes per user/role/device.
//
// DEPLOY: copy this file into the website repo's `api/` folder as
// `api/_register-push-token.js`, add the route to api/compliance.js ROUTES and
// a rewrite to vercel.json (see notifications/NOTIFICATIONS.md). It rides the
// existing single-router function, so it does NOT consume a new Hobby-plan slot.
//
// Auth: Authorization: Bearer <supabase access token>. The user id is derived
// from the verified token — the body's userId is only a fallback hint and is
// never trusted when a valid token is present.
//
// Uses the SUPABASE SERVICE ROLE key (process.env.CIARALINK_SUPABASE_SERVICE_KEY
// or SUPABASE_SERVICE_ROLE_KEY) server-side only; it is never returned. No npm
// deps — talks to the Supabase REST/Auth API directly via fetch.

const PUBLIC_SUPABASE_URL =
  process.env.SUPABASE_URL || "https://txcndwunbwuexasqtrow.supabase.co";

const VALID_PLATFORMS = new Set(["ios", "android", "web", "unknown"]);

function serviceKey() {
  return (
    process.env.CIARALINK_SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    null
  );
}

async function verifyUser(accessToken) {
  if (!accessToken) return null;
  try {
    const r = await fetch(`${PUBLIC_SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: process.env.SUPABASE_ANON_KEY || "",
      },
    });
    if (!r.ok) return null;
    const u = await r.json();
    return u && u.id ? u : null;
  } catch (e) {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const key = serviceKey();
  if (!key) {
    return res
      .status(500)
      .json({ error: "Push token store not configured (missing service key)" });
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  body = body || {};

  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token || token.length > 4096) {
    return res.status(400).json({ error: "Missing or invalid token" });
  }
  const platform = VALID_PLATFORMS.has(body.platform) ? body.platform : "unknown";

  // Derive the user from the Bearer token; fall back to body hint only if absent.
  const auth = req.headers.authorization || req.headers.Authorization || "";
  const accessToken = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  const user = await verifyUser(accessToken);
  const userId = user ? user.id : (typeof body.userId === "string" ? body.userId : null);
  if (!userId) {
    return res.status(401).json({ error: "Unauthenticated — no valid user" });
  }
  const role = typeof body.role === "string" ? body.role.slice(0, 64) : null;

  // Upsert on the token (a device's token is unique; ownership can move between
  // users on shared devices, so the token is the conflict target).
  try {
    const r = await fetch(
      `${PUBLIC_SUPABASE_URL}/rest/v1/device_tokens?on_conflict=token`,
      {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          Prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify({
          token,
          platform,
          user_id: userId,
          role,
          last_seen: new Date().toISOString(),
        }),
      }
    );
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      return res.status(502).json({ error: "Store failed", detail: detail.slice(0, 300) });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(502).json({ error: "Store error", detail: String(e).slice(0, 300) });
  }
}
