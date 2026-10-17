// Browser-side bridge: makes `gadget.someMethod(...args)` call POST /api/someMethod.
// Loaded before client.js so the original UI code works unchanged.
(function () {
  const KEY = "hrAdminPassword";

  function getAdminPassword() {
    try {
      return sessionStorage.getItem(KEY) || "";
    } catch {
      return window.__hrAdminPassword || "";
    }
  }

  function setAdminPassword(pw) {
    try {
      sessionStorage.setItem(KEY, pw);
    } catch {
      window.__hrAdminPassword = pw;
    }
  }

  async function call(method, args) {
    const res = await fetch("/api/" + encodeURIComponent(method), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-admin-password": getAdminPassword(),
      },
      body: JSON.stringify({ args }),
    });
    let data;
    try {
      data = await res.json();
    } catch {
      throw new Error("Server returned an unexpected response (HTTP " + res.status + ").");
    }
    if (!res.ok || data.error) {
      throw new Error(data.error || "Request failed (HTTP " + res.status + ").");
    }
    return data.result;
  }

  window.gadget = new Proxy(
    {
      setAdminPassword,
      async checkAdmin(pw) {
        const ok = await call("checkAdmin", [pw]);
        if (ok) setAdminPassword(pw);
        return ok;
      },
    },
    {
      get(target, prop) {
        if (prop in target) return target[prop];
        if (typeof prop !== "string") return undefined;
        return (...args) => call(prop, args);
      },
    }
  );
})();
