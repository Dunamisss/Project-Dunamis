import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "..", "dist");
const indexPath = path.join(distDir, "index.html");
const promptLibraryPath = path.resolve(__dirname, "..", "src", "data", "promptLibrary.ts");
const imageLibraryPath = path.resolve(__dirname, "..", "src", "data", "imageLibrary.ts");

const staticRoutes = ["/", "/prompts", "/library", "/images", "/gallery", "/frameworks", "/json-prompt-architect", "/suno-song-machine", "/toy-figure-studio", "/profile"];

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

function extractPromptMeta(fileText) {
  const records = new Map();
  const recordRegex = /\bid\s*:\s*"([^"]+)"[\s\S]*?title\s*:\s*"((?:\\.|[^"\\])*)"[\s\S]*?description\s*:\s*"((?:\\.|[^"\\])*)"/g;
  let match;
  while ((match = recordRegex.exec(fileText))) {
    records.set(match[1], {
      title: match[2].replace(/\\"/g, "\""),
      description: match[3].replace(/\\"/g, "\""),
    });
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

function extractImageMeta(fileText) {
  const map = new Map();
  const recordRegex = /"id"\s*:\s*"([^"]+)"[\s\S]*?"title"\s*:\s*"([^"]*)"[\s\S]*?"description"\s*:\s*"([^"]*)"[\s\S]*?"full"\s*:\s*"([^"]*)"/g;
  let match;
  while ((match = recordRegex.exec(fileText))) {
    map.set(match[1], {
      title: match[2],
      description: match[3],
      full: match[4],
    });
  }
  return map;
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
  const promptMeta = extractPromptMeta(promptText);
  const imageRecords = extractImageIdDates(imageText);
  const imageIds = extractImageIds(imageText);
  const imageMeta = extractImageMeta(imageText);

  const promptRoutes = promptIds.map((id) => `/prompt/${id}`);
  const imageRoutes = imageIds.map((id) => `/image/${id}`);

  return {
    routes: uniqueSorted([...promptRoutes, ...imageRoutes]),
    promptRecords,
    imageRecords,
    promptMeta,
    imageMeta,
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

function canonicalizeRoute(route) {
  if (route === "/library") return "/prompts";
  if (route === "/gallery") return "/images";
  return route;
}

async function writeSitemap(siteUrl, routes, promptRecords, imageRecords) {
  const today = new Date().toISOString().split("T")[0];
  const { map, latestPrompt, latestImage } = buildLastmodMap(
    promptRecords,
    imageRecords,
  );
  const canonicalRoutes = uniqueSorted(routes.map((route) => canonicalizeRoute(route)));

  const entries = canonicalRoutes.map((route) => {
    const loc = route === "/" ? `${siteUrl}/` : `${siteUrl}${encodeURI(route)}`;
    const lastmod =
      map.get(route) ||
      (route === "/prompts" ? latestPrompt : null) ||
      (route === "/images" ? latestImage : null) ||
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
  ].join("\n");
  await fs.writeFile(path.join(distDir, "robots.txt"), content, "utf8");
}

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function upsertTag(html, regex, replacement, insertBefore = "</head>") {
  if (regex.test(html)) {
    return html.replace(regex, replacement);
  }
  return html.replace(insertBefore, `${replacement}\n${insertBefore}`);
}

function upsertBodyHeading(html, headingText) {
  const heading = `<h1 data-route-h1 style="position:absolute;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden;white-space:nowrap;">${escapeAttr(headingText)}</h1>`;
  if (/<h1\b/i.test(html) && !/<h1[^>]*data-route-h1/i.test(html)) {
    return html;
  }
  if (/<h1[^>]*data-route-h1[^>]*>[\s\S]*?<\/h1>/i.test(html)) {
    return html.replace(/<h1[^>]*data-route-h1[^>]*>[\s\S]*?<\/h1>/i, heading);
  }
  return html.replace(/<body([^>]*)>/i, `<body$1>\n${heading}`);
}

function injectRouteMeta(html, meta) {
  const titleTag = `<title>${escapeAttr(meta.title)}</title>`;
  html = upsertTag(html, /<title>[\s\S]*?<\/title>/i, titleTag);

  html = upsertTag(
    html,
    /<link\s+rel="canonical"[^>]*>/i,
    `<link rel="canonical" href="${escapeAttr(meta.url)}" />`,
  );

  html = upsertTag(
    html,
    /<meta\s+name="description"[^>]*>/i,
    `<meta name="description" content="${escapeAttr(meta.description)}" />`,
  );
  html = upsertTag(
    html,
    /<meta\s+name="robots"[^>]*>/i,
    `<meta name="robots" content="${escapeAttr(meta.robots || "index,follow")}" />`,
  );

  html = upsertTag(
    html,
    /<meta\s+property="og:title"[^>]*>/i,
    `<meta property="og:title" content="${escapeAttr(meta.title)}" />`,
  );
  html = upsertTag(
    html,
    /<meta\s+property="og:description"[^>]*>/i,
    `<meta property="og:description" content="${escapeAttr(meta.description)}" />`,
  );
  html = upsertTag(
    html,
    /<meta\s+property="og:image"[^>]*>/i,
    `<meta property="og:image" content="${escapeAttr(meta.image)}" />`,
  );
  html = upsertTag(
    html,
    /<meta\s+property="og:url"[^>]*>/i,
    `<meta property="og:url" content="${escapeAttr(meta.url)}" />`,
  );

  html = upsertTag(
    html,
    /<meta\s+name="twitter:title"[^>]*>/i,
    `<meta name="twitter:title" content="${escapeAttr(meta.title)}" />`,
  );
  html = upsertTag(
    html,
    /<meta\s+name="twitter:description"[^>]*>/i,
    `<meta name="twitter:description" content="${escapeAttr(meta.description)}" />`,
  );
  html = upsertTag(
    html,
    /<meta\s+name="twitter:image"[^>]*>/i,
    `<meta name="twitter:image" content="${escapeAttr(meta.image)}" />`,
  );

  if (meta.jsonLd) {
    const jsonLd = `<script type="application/ld+json">${JSON.stringify(meta.jsonLd)}</script>`;
    html = upsertTag(html, /<script\s+type="application\/ld\+json"[^>]*data-route="page"[^>]*>[\s\S]*?<\/script>/i, jsonLd.replace("<script", "<script data-route=\"page\""));
  }

  html = upsertBodyHeading(html, meta.h1 || "DUNAMIS");

  return html;
}

function buildRouteMeta({
  route,
  siteUrl,
  defaultMeta,
  promptMeta,
  imageMeta,
}) {
  const canonicalRoute = canonicalizeRoute(route);
  const base = {
    title: defaultMeta.title,
    h1: "DUNAMIS",
    description: defaultMeta.description,
    image: defaultMeta.image,
    url: canonicalRoute === "/" ? `${siteUrl}/` : `${siteUrl}${canonicalRoute}`,
    robots: "index,follow",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "DUNAMIS",
      url: siteUrl,
      description: defaultMeta.description,
      publisher: {
        "@type": "Organization",
        name: "DUNAMIS",
      },
    },
  };

  if (route === "/prompts" || route === "/library") {
    return {
      ...base,
      title: "Prompt Library — DUNAMIS",
      h1: "Prompt Library",
      description: "Browse the Dunamis prompt library: curated prompts for creators who ship.",
    };
  }
  if (route === "/images" || route === "/gallery") {
    return {
      ...base,
      title: "Image Library — DUNAMIS",
      h1: "Image Library",
      description: "Explore the Dunamis image library and reverse-engineer prompts.",
    };
  }
  if (route === "/frameworks") {
    return {
      ...base,
      title: "Prompting Frameworks — DUNAMIS",
      h1: "Prompting Frameworks",
      description: "Practical prompting frameworks with clear structure, examples, and best-use guidance.",
    };
  }
  if (route === "/suno-song-machine") {
    return {
      ...base,
      title: "Suno Song Machine (Beta) — DUNAMIS",
      h1: "Suno Song Machine",
      description: "Generate structured Suno-ready songs with preview lyrics, full sections, and paste-ready style prompts.",
    };
  }
  if (route === "/toy-figure-studio") {
    return {
      ...base,
      title: "Toy Figure Studio — DUNAMIS",
      h1: "Toy Figure Studio",
      description: "Turn uploaded-photo ideas into pro collectible action-figure prompts and JSON blueprints with packaging and accessory controls.",
    };
  }
  if (route === "/json-prompt-architect") {
    return {
      ...base,
      title: "JSON Prompt Architect — DUNAMIS",
      h1: "JSON Prompt Architect",
      description: "Build image prompts with structured JSON blueprints and convert them into plain prompts for production use.",
    };
  }
  if (route === "/profile") {
    return {
      ...base,
      title: "Profile — DUNAMIS",
      h1: "Profile",
      description: "Manage your Dunamis profile and avatar.",
      robots: "noindex,follow",
    };
  }

  if (route.startsWith("/prompt/")) {
    const id = route.replace("/prompt/", "");
    const data = promptMeta.get(id);
    const title = data?.title || id.replace(/-/g, " ");
    const description = data?.description || base.description;
    return {
      ...base,
      title: `${title} — DUNAMIS`,
      h1: title,
      description,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        name: title,
        description,
        url: base.url,
        publisher: {
          "@type": "Organization",
          name: "DUNAMIS",
          url: siteUrl,
        },
      },
    };
  }

  if (route.startsWith("/image/")) {
    const id = route.replace("/image/", "");
    const data = imageMeta.get(id);
    const title = data?.title || id.replace(/-/g, " ");
    const description = data?.description || base.description;
    const imageUrl = data?.full ? `${siteUrl}${data.full}` : base.image;
    return {
      ...base,
      title: `${title} — DUNAMIS`,
      h1: title,
      description,
      image: imageUrl,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "ImageObject",
        name: title,
        description,
        contentUrl: imageUrl,
        url: base.url,
        publisher: {
          "@type": "Organization",
          name: "DUNAMIS",
          url: siteUrl,
        },
      },
    };
  }

  return base;
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

  const defaultMeta = {
    title: "DUNAMIS — Precision Prompt Engineering",
    description: "Build, score, and refine prompts with a production-grade optimizer and auditor built for creators who ship.",
    image: "https://dunamiss.xyz/dunamis-hero.webp",
  };

  const updated = await Promise.all(
    allRoutes.map(async (route) => {
      const routeHtml = injectRouteMeta(
        html,
        buildRouteMeta({
          route,
          siteUrl,
          defaultMeta,
          promptMeta: dynamicResult.promptMeta,
          imageMeta: dynamicResult.imageMeta,
        }),
      );
      if (route === "/") {
        await fs.writeFile(indexPath, routeHtml, "utf8");
      } else {
        const routeDir = path.join(distDir, route.replace(/^\//, ""));
        const outPath = path.join(routeDir, "index.html");
        await fs.writeFile(outPath, routeHtml, "utf8");
      }
      return route;
    }),
  );

  console.log(`Prerendered ${allRoutes.length - 1} routes into ${distDir}`);
  console.log(`Generated sitemap.xml and robots.txt for ${siteUrl}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
