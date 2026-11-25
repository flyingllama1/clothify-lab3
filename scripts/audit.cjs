const { mkdirSync, writeFileSync } = require("node:fs");
const { spawnSync } = require("node:child_process");

mkdirSync("audit-reports", { recursive: true });

for (const [name, folder] of [["root", "."], ["backend", "backend"], ["frontend", "frontend"]]) {
  const result = spawnSync(process.platform === "win32" ? "npm.cmd" : "npm",
    ["--prefix", folder, "audit", "--audit-level=critical", "--json"],
    { encoding: "utf8", shell: process.platform === "win32" });
  writeFileSync(`audit-reports/${name}.json`, result.stdout ?? "");

  if (result.error || result.stderr) {
    console.error(result.error ?? result.stderr.trim());
  }

  try {
    const { metadata, error } = JSON.parse(result.stdout);
    if (error || !metadata?.vulnerabilities) {
      throw new Error(error?.summary || error?.detail || "Missing vulnerability counts");
    }
    const { critical, high, moderate, low } = metadata.vulnerabilities;
    console.log(`${name}: critical=${critical}, high=${high}, moderate=${moderate}, low=${low}`);
    if (critical > 0) {
      console.error(`${name}: quality gate failed (critical vulnerabilities found)`);
    }
    if (result.status !== 0 || critical > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(`${name}: audit failed: ${error.message}`);
    process.exitCode = 1;
  }
}
