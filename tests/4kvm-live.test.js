const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const filename = path.resolve(__dirname, "../widgets/4kvm-resource.js");
const context = {
  console,
  Date,
  JSON,
  Promise,
  URL,
  encodeURIComponent,
  decodeURIComponent,
  WebAssembly,
  TextEncoder,
  TextDecoder,
  Uint8Array,
  ArrayBuffer,
  DataView,
  Widget: {
    http: {
      async get(url, options = {}) {
        const response = await fetch(url, { headers: options.headers || {}, redirect: "follow" });
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
        if (options.responseType === "arraybuffer") return { data: await response.arrayBuffer() };
        const contentType = response.headers.get("content-type") || "";
        return { data: contentType.includes("application/json") ? await response.json() : await response.text() };
      },
    },
  },
};

vm.createContext(context);
vm.runInContext(fs.readFileSync(filename, "utf8"), context, { filename });

(async () => {
  const streams = await context.loadResource({
    seriesName: "复仇者联盟4：终局之战",
    type: "movie",
    episode: 1,
  });
  assert.ok(streams.length > 0, "live 4KVM chain returned no unlocked stream");
  assert.ok(/^https?:\/\//.test(streams[0].url));
  console.log(`PASS 4KVM live: ${streams[0].name} ${streams[0].url}`);
})().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
