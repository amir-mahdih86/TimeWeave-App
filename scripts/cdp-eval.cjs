// One-off CDP inspector for the TimeWeave WebView.
// Usage: node scripts/cdp-eval.mjs '<expression>'
const WebSocket = require("ws");

async function main() {
  const expr = process.argv[2];
  if (!expr) {
    console.error("usage: node scripts/cdp-eval.mjs '<js expression>'");
    process.exit(1);
  }
  const pages = await (await fetch("http://127.0.0.1:9222/json")).json();
  const page = pages.find(p => p.type === "page");
  if (!page) throw new Error("no debuggable page");
  const ws = new WebSocket(page.webSocketDebuggerUrl, { perMessageDeflate: false });
  await new Promise((res, rej) => { ws.on("open", res); ws.on("error", rej); });
  const result = await new Promise((res, rej) => {
    ws.on("message", data => {
      const msg = JSON.parse(data);
      if (msg.id === 1) res(msg);
    });
    ws.send(JSON.stringify({
      id: 1,
      method: "Runtime.evaluate",
      params: { expression: expr, returnByValue: true, awaitPromise: true },
    }));
    setTimeout(() => rej(new Error("timeout")), 15000);
  });
  if (result.result?.exceptionDetails) {
    console.log(JSON.stringify(result.result.exceptionDetails, null, 2));
  } else {
    console.log(JSON.stringify(result.result?.result?.value, null, 2));
  }
  ws.close();
  process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
