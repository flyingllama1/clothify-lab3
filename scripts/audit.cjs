const { mkdirSync, writeFileSync } = require("node:fs");
const { spawnSync } = require("node:child_process");

const npm = process.platform === "win32" ? "npm.cmd" : "npm";

function audit(name, folder) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const result = spawnSync(npm,
      ["--prefix", folder, "audit", "--package-lock-only", "--audit-level=critical", "--json"],
      { encoding: "utf8", shell: process.platform === "win32" });
    writeFileSync(`audit-reports/${name}.json`, result.stdout ?? "");

    try {
      const { metadata, error } = JSON.parse(result.stdout);
      if (error || !Number.isInteger(metadata?.vulnerabilities?.critical)) {
        throw new Error(error?.summary || error?.detail || error?.code || "Missing vulnerability counts");
      }

      const { critical, high, moderate, low } = metadata.vulnerabilities;
      console.log(`${name}: critical=${critical}, high=${high}, moderate=${moderate}, low=${low}`);
      if (critical > 0) {
        console.error(`${name}: quality gate failed (critical vulnerabilities found)`);
      }
      return result.status === 0 && critical === 0;
    } catch (error) {
      console.error(`${name}: audit attempt ${attempt}/3 failed: ${result.error?.message ?? error.message}`);
      if (result.stderr) console.error(result.stderr.trim());
    }
  }
  return false;
}

mkdirSync("audit-reports", { recursive: true });
for (const [name, folder] of [["root", "."], ["backend", "backend"], ["frontend", "frontend"]]) {
  if (!audit(name, folder)) process.exitCode = 1;
}
