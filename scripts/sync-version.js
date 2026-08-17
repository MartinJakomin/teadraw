import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, join } from "path";

const rootDir = resolve(".");
const rootPkgPath = join(rootDir, "package.json");

if (!existsSync(rootPkgPath)) {
  process.exit(0);
}

const rootPkg = JSON.parse(readFileSync(rootPkgPath, "utf-8"));
const version = rootPkg.version;

if (!version) {
  process.exit(0);
}

const targets = ["server/package.json", "client/package.json"];

for (const relPath of targets) {
  const targetPath = join(rootDir, relPath);
  if (existsSync(targetPath)) {
    const pkg = JSON.parse(readFileSync(targetPath, "utf-8"));
    if (pkg.version !== version) {
      pkg.version = version;
      writeFileSync(targetPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8");
      console.log(`[sync-version] Synced ${relPath} -> v${version}`);
    }
  }
}
