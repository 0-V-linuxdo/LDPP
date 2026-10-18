(async () => {
    for (let i = 0; i < 40 && !location.hash.startsWith("#ldpp="); i++) await new Promise(r => setTimeout(r, 100));
    const payload = location.hash.startsWith("#ldpp=") ? location.hash.slice(6) : "";
    if (!payload) return { error: "no payload in hash", url: location.href };
    history.replaceState(history.state, "", location.pathname + location.search);
    const bytes = Uint8Array.from(atob(payload), c => c.charCodeAt(0));
    const script = document.createElement("script");
    script.nonce = document.querySelector("script[nonce]")?.nonce || "";
    script.textContent = new TextDecoder().decode(bytes);
    document.head.appendChild(script);
    await new Promise(r => setTimeout(r, 1200));
    return { ok: Boolean(window.LDPP), version: window.LDPP?.version };
})()
