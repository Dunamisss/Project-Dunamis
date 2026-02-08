import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "..", "dist");
const indexPath = path.join(distDir, "index.html");

const routes = ["/", "/prompts", "/library", "/images", "/gallery"];

async function ensureFileExists(filePath) {
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(`Missing required file: ${filePath}`);
  }
}

async function writeRoute(route, html) {
  if (route === "/") {
    return;
  }
  const routeDir = path.join(distDir, route.replace(/^\//, ""));
  await fs.mkdir(routeDir, { recursive: true });
  const outPath = path.join(routeDir, "index.html");
  await fs.writeFile(outPath, html, "utf8");
}

async function main() {
  await ensureFileExists(indexPath);
  const html = await fs.readFile(indexPath, "utf8");

  await Promise.all(routes.map((route) => writeRoute(route, html)));
  console.log(`Prerendered ${routes.length - 1} routes into ${distDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
