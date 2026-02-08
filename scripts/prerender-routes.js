import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "..", "dist");
const indexPath = path.join(distDir, "index.html");
const promptLibraryPath = path.resolve(__dirname, "..", "src", "data", "promptLibrary.ts");
const imageLibraryPath = path.resolve(__dirname, "..", "src", "data", "imageLibrary.ts");

const staticRoutes = ["/", "/prompts", "/library", "/images", "/gallery"];

async function ensureFileExists(filePath) {
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(`Missing required file: ${filePath}`);
  }
}

function uniqueSorted(list) {
  return Array.from(new Set(list)).sort();
}

function extractPromptIds(fileText) {
  const ids = [];
  const idRegex = /\\bid\\s*:\\s*\"([^\"]+)\"/g;
  let match;
  while ((match = idRegex.exec(fileText))) {
    ids.push(match[1]);
  }
  return ids;
}

function extractImageIds(fileText) {
  const ids = [];
  const idRegex = /\"id\"\\s*:\\s*\"([^\"]+)\"/g;
  let match;
  while ((match = idRegex.exec(fileText))) {
    ids.push(match[1]);
  }
  return ids;
}

async function getDynamicRoutes() {
  const [promptText, imageText] = await Promise.all([
    fs.readFile(promptLibraryPath, "utf8"),
    fs.readFile(imageLibraryPath, "utf8"),
  ]);

  const promptIds = extractPromptIds(promptText);
  const imageIds = extractImageIds(imageText);

  const promptRoutes = promptIds.map((id) => `/prompt/${id}`);
  const imageRoutes = imageIds.map((id) => `/image/${id}`);

  return uniqueSorted([...promptRoutes, ...imageRoutes]);
}

async function writeRoute(route, html) {
  if (route === "/") {
    return;
  }
  const routeDir = path.join(distDir, route.replace(/^\\//, ""));
  await fs.mkdir(routeDir, { recursive: true });
  const outPath = path.join(routeDir, "index.html");
  await fs.writeFile(outPath, html, "utf8");
}

function normalizeSiteUrl(url) {
  if (!url) return null;
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function extractCanonicalUrl(html) {
  const match = html.match(/rel=\"canonical\"\\s+href=\"([^\"]+)\"/i);
  return match ? match[1] : null;
}

async function writeSitemap(siteUrl, routes) {
  const lastmod = new Date().toISOString().split("T")[0];
  const entries = routes.map((route) => {
    const loc = route === "/" ? `${siteUrl}/` : `${siteUrl}${route}`;
    return `  <url>\\n    <loc>${loc}</loc>\\n    <lastmod>${lastmod}</lastmod>\\n  </url>`;
  });
  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...entries,
    `</urlset>`,
    ``,
  ].join("\\n");
  await fs.writeFile(path.join(distDir, "sitemap.xml"), xml, "utf8");
}

async function writeRobots(siteUrl) {
  const content = [
    "User-agent: *",
    "Allow: /",
    `Sitemap: ${siteUrl}/sitemap.xml`,
    "",
  ].join("\\n");
  await fs.writeFile(path.join(distDir, "robots.txt"), content, "utf8");
}

async function main() {
  await ensureFileExists(indexPath);
  const html = await fs.readFile(indexPath, "utf8");
  const dynamicRoutes = await getDynamicRoutes();
  const allRoutes = uniqueSorted([...staticRoutes, ...dynamicRoutes]);

  await Promise.all(allRoutes.map((route) => writeRoute(route, html)));

  const siteUrl =
    normalizeSiteUrl(process.env.SITE_URL) ||
    normalizeSiteUrl(extractCanonicalUrl(html)) ||
    "https://dunamiss.xyz";

  await writeSitemap(siteUrl, allRoutes);
  await writeRobots(siteUrl);

  console.log(`Prerendered ${allRoutes.length - 1} routes into ${distDir}`);
  console.log(`Generated sitemap.xml and robots.txt for ${siteUrl}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
