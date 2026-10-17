// Cloudflare Worker entry point for the Concierge AI HR Agent.
// - Serves the web UI from /public (index.html + client.js) via static assets.
// - Exposes POST /api/<method> which forwards to the Gadget Durable Object.
// - Admin methods require the ADMIN_PASSWORD secret (checked server-side).

import { Gadget } from "./gadget.js";
export { Gadget };

// Methods any employee can call.
const PUBLIC_METHODS = new Set(["findAnswer"]);

// Methods only HR admins can call (must send the admin password header).
const ADMIN_METHODS = new Set([
  "getQuestions",
  "getDocuments",
  "addQuestion",
  "uploadBatch",
  "uploadDocument",
  "clearLocation",
]);

const ALLOWED_LOCATIONS = ["singapore", "switzerland"];

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}

// Constant-time string comparison to avoid timing leaks on the password check.
function safeEqual(a, b) {
  const enc = new TextEncoder();
  const x = enc.encode(String(a || ""));
  const y = enc.encode(String(b || ""));
  let diff = x.length ^ y.length;
  const len = Math.max(x.length, y.length);
  for (let i = 0; i < len; i++) {
    diff |= (x[i] || 0) ^ (y[i] || 0);
  }
  return diff === 0;
}

function isAdmin(request, env) {
  if (!env.ADMIN_PASSWORD) return false; // secret not configured => admin locked
  return safeEqual(request.headers.get("x-admin-password"), env.ADMIN_PASSWORD);
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (!url.pathname.startsWith("/api/")) {
      // Everything else is the static web UI.
      return env.ASSETS.fetch(request);
    }

    if (request.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const method = url.pathname.slice("/api/".length);

    let args;
    try {
      const body = await request.json();
      args = Array.isArray(body.args) ? body.args : [];
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    // Password check endpoint used by the HR Admin unlock screen.
    if (method === "checkAdmin") {
      if (!env.ADMIN_PASSWORD) {
        return json({ error: "Admin password is not configured on the server." }, 500);
      }
      return json({ result: safeEqual(args[0], env.ADMIN_PASSWORD) });
    }

    if (!PUBLIC_METHODS.has(method) && !ADMIN_METHODS.has(method)) {
      return json({ error: "Unknown method: " + method }, 404);
    }

    if (ADMIN_METHODS.has(method) && !isAdmin(request, env)) {
      return json({ error: "Unauthorized. Please unlock the HR Admin panel again." }, 401);
    }

    // Every method takes location as its first argument (findAnswer: second).
    const location = String((method === "findAnswer" ? args[1] : args[0]) || "");
    if (!ALLOWED_LOCATIONS.includes(location.toLowerCase())) {
      return json({ error: "Please select a valid location." }, 400);
    }

    // Single shared Durable Object instance holds all HR content.
    const stub = env.GADGET.get(env.GADGET.idFromName("hr-agent"));

    try {
      const result = await stub[method](...args);
      return json({ result });
    } catch (err) {
      return json({ error: err && err.message ? err.message : String(err) }, 500);
    }
  },
};
