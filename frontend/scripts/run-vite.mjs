import { spawn } from "node:child_process";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const tempDir = "D:/MET/temp";
const npmCacheDir = "D:/MET/npmcache";

for (const dir of [tempDir, npmCacheDir]) {
  fs.mkdirSync(dir, { recursive: true });
}

const env = {
  ...process.env,
  TMPDIR: tempDir,
  TEMP: tempDir,
  TMP: tempDir,
  npm_config_cache: npmCacheDir,
};

const target = process.argv[2] || "dev";
const viteBin = fileURLToPath(new URL("../node_modules/vite/bin/vite.js", import.meta.url));

const child = spawn(process.execPath, [viteBin, target], {
  stdio: "inherit",
  env,
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
