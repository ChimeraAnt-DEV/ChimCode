/* ============================================================
   ChimCode frontend bootstrap.

   Picks the best available backend so the app always works:
     1. ChimLocal  — runs fully in the browser, zero setup (default)
     2. ChimCode server over HTTP, if one is reachable (optional)
   The adaptive check happens once and both backends expose the
   same call(path, method, body) async API.
   ============================================================ */
(function () {
  const SERVER_KEY = "chimcode_server_url";
  let mode = "local";
  let base = "";

  function envServer() {
    const q = new URLSearchParams(location.search).get("server");
    if (q) return q.replace(/\/$/, "");
    if (typeof window.CHIMCODE_SERVER === "string") return window.CHIMCODE_SERVER.replace(/\/$/, "");
    try { return (localStorage.getItem(SERVER_KEY) || "").replace(/\/$/, ""); } catch (e) { return ""; }
  }

  function probe(url, ms) {
    return new Promise((resolve) => {
      if (!url) return resolve(false);
      let done = false;
      const finish = (v) => { if (!done) { done = true; resolve(v); } };
      const timer = setTimeout(() => finish(false), ms);
      fetch(url + "/api/health", { method: "GET" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => { clearTimeout(timer); finish(!!(d && d.status === "ok")); })
        .catch(() => { clearTimeout(timer); finish(false); });
    });
  }

  async function select() {
    // 1. An explicitly configured server wins.
    const explicit = envServer();
    if (explicit && await probe(explicit, 1500)) { mode = "server"; base = explicit; return; }
    if (mode === "server" && base && await probe(base, 1500)) return;

    // 2. Served over http(s)? Use the co-located ChimCode server if it answers,
    //    so shared accounts and social features work across devices.
    const proto = (location && location.protocol) || "";
    if (proto === "http:" || proto === "https:") {
      const same = (location.origin || "").replace(/\/$/, "");
      if (same && same !== "null" && await probe(same, 1200)) { mode = "server"; base = same; return; }
    }

    // 3. Otherwise run entirely locally. No server, no setup, no internet.
    mode = "local";
    base = "";
  }

  window.ChimAPI = {
    get mode() { return mode; },
    setServer(url) {
      try { localStorage.setItem(SERVER_KEY, url || ""); } catch (e) { /* ignore */ }
      base = (url || "").replace(/\/$/, "");
      mode = url ? "server" : "local";
    },
    async call(path, method, body) {
      if (mode === "server") {
        try {
          const headers = { "Content-Type": "application/json" };
          let token = "";
          try { token = localStorage.getItem("chimcode_token") || ""; } catch (e) { /* ignore */ }
          if (token) headers["Authorization"] = "Bearer " + token;
          const res = await fetch(base + "/api" + path, {
            method: method || "GET", headers,
            body: body ? JSON.stringify(body) : undefined,
          });
          let data = null;
          try { data = await res.json(); } catch (e) { data = {}; }
          if (!res.ok) { const err = new Error((data && data.detail) || "Request failed"); err.status = res.status; throw err; }
          return data;
        } catch (e) {
          if (e && e.status) throw e;
          // Server dropped out mid-session: fall back to local so the user is never stuck.
          mode = "local";
        }
      }
      return window.ChimLocal.call(path, method, body);
    },
    async boot() {
      window.ChimLocal.init();
      await select();
      return mode;
    },
  };
})();
