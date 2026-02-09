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
  const idRegex = /\bid\s*:\s*"([^"]+)"/g;
  let match;
  while ((match = idRegex.exec(fileText))) {
    ids.push(match[1]);
  }
  return ids;
}

function extractImageIds(fileText) {
  const ids = [];
  const idRegex = /"id"\s*:\s*"([^"]+)"/g;
  let match;
  while ((match = idRegex.exec(fileText))) {
    ids.push(match[1]);
  }
  return ids;
}

function extractPromptIdDates(fileText) {
  const records = [];
  const recordRegex = /\bid\s*:\s*"([^"]+)"[\s\S]*?createdAt\s*:\s*(\d+)/g;
  let match;
  while ((match = recordRegex.exec(fileText))) {
    records.push({ id: match[1], createdAt: Number(match[2]) });
  }
  return records;
}

function extractImageIdDates(fileText) {
  const records = [];
  const recordRegex = /"id"\s*:\s*"([^"]+)"[\s\S]*?"createdAt"\s*:\s*(\d+)/g;
  let match;
  while ((match = recordRegex.exec(fileText))) {
    records.push({ id: match[1], createdAt: Number(match[2]) });
  }
  return records;
}

function toDateString(timestamp) {
  if (!timestamp || Number.isNaN(timestamp) || timestamp <= 0) {
    return null;
  }
  const ms = timestamp > 1e12 ? timestamp : timestamp * 1000;
  return new Date(ms).toISOString().split("T")[0];
}

async function getDynamicRoutes() {
  const [promptText, imageText] = await Promise.all([
    fs.readFile(promptLibraryPath, "utf8"),
    fs.readFile(imageLibraryPath, "utf8"),
  ]);

  const promptRecords = extractPromptIdDates(promptText);
  const promptIds = extractPromptIds(promptText);
  const imageRecords = extractImageIdDates(imageText);
  const imageIds = extractImageIds(imageText);

  const promptRoutes = promptIds.map((id) => `/prompt/${id}`);
  const imageRoutes = imageIds.map((id) => `/image/${id}`);

  return {
    routes: uniqueSorted([...promptRoutes, ...imageRoutes]),
    promptRecords,
    imageRecords,
  };
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

function normalizeSiteUrl(url) {
  if (!url) return null;
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

function extractCanonicalUrl(html) {
  const match = html.match(/rel="canonical"\s+href="([^"]+)"/i);
  return match ? match[1] : null;
}

function buildLastmodMap(promptRecords, imageRecords) {
  const map = new Map();
  let latestPrompt = null;
  let latestImage = null;

  for (const item of promptRecords) {
    const date = toDateString(item.createdAt);
    if (date) {
      map.set(`/prompt/${item.id}`, date);
      if (!latestPrompt || date > latestPrompt) latestPrompt = date;
    }
  }

  for (const item of imageRecords) {
    const date = toDateString(item.createdAt);
    if (date) {
      map.set(`/image/${item.id}`, date);
      if (!latestImage || date > latestImage) latestImage = date;
    }
  }

  return { map, latestPrompt, latestImage };
}

async function writeSitemap(siteUrl, routes, promptRecords, imageRecords) {
  const today = new Date().toISOString().split("T")[0];
  const { map, latestPrompt, latestImage } = buildLastmodMap(
    promptRecords,
    imageRecords,
  );

  const entries = routes.map((route) => {
    const loc = route === "/" ? `${siteUrl}/` : `${siteUrl}${encodeURI(route)}`;
    const lastmod =
      map.get(route) ||
      (route === "/prompts" || route === "/library" ? latestPrompt : null) ||
      (route === "/images" || route === "/gallery" ? latestImage : null) ||
      today;
    return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`;
  });
  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...entries,
    `</urlset>`,
    ``,
  ].join("\n");
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
  const dynamicResult = await getDynamicRoutes();
  const allRoutes = uniqueSorted([...staticRoutes, ...dynamicResult.routes]);

  await Promise.all(allRoutes.map((route) => writeRoute(route, html)));

  const siteUrl =
    normalizeSiteUrl(process.env.SITE_URL) ||
    normalizeSiteUrl(extractCanonicalUrl(html)) ||
    "https://dunamiss.xyz";

  await writeSitemap(
    siteUrl,
    allRoutes,
    dynamicResult.promptRecords,
    dynamicResult.imageRecords,
  );
  await writeRobots(siteUrl);

  console.log(`Prerendered ${allRoutes.length - 1} routes into ${distDir}`);
  console.log(`Generated sitemap.xml and robots.txt for ${siteUrl}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
