const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const dbPath = process.env.DB_PATH || "/data/app.db";
process.env.DATABASE_URL = process.env.DATABASE_URL || `file:${dbPath}`;

fs.mkdirSync(path.dirname(dbPath), { recursive: true });
fs.mkdirSync(path.join(process.cwd(), "public", "uploads"), { recursive: true });
const dataRoot = path.dirname(dbPath);
fs.mkdirSync(path.join(dataRoot, "org-assets"), { recursive: true });

if (!fs.existsSync(dbPath) || fs.statSync(dbPath).size === 0) {
  const template = path.join(process.cwd(), "prisma", "build.db");
  const initial = path.join(process.cwd(), "prisma", "dev.db");
  const source = fs.existsSync(template) ? template : initial;
  if (!fs.existsSync(source)) {
    throw new Error("Нет шаблона базы (prisma/build.db). Пересоберите образ.");
  }
  fs.copyFileSync(source, dbPath);
}

try {
  execSync("node ./ensure-schema.js", { stdio: "inherit" });
} catch (error) {
  console.error("ensure-schema:", error.message);
}

try {
  execSync("node ./bootstrap-prod.js", { stdio: "inherit" });
} catch (error) {
  console.error("bootstrap-prod:", error.message);
}

try {
  execSync("node ./apply-prices.js", { stdio: "inherit" });
} catch (error) {
  console.error("apply-prices:", error.message);
}

require("./server.js");
