import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const siteDirectory = path.resolve(scriptDirectory, "..");
const distDirectory = path.join(siteDirectory, "dist");
const basePath = "/microsoft-50-years-webgl/";
const port = Number(process.env.PORT ?? 4174);
const host = process.env.HOST ?? "127.0.0.1";

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".jpg", "image/jpeg"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
]);

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host}`);
    if (url.pathname === basePath.slice(0, -1)) {
      response.writeHead(308, { Location: basePath });
      response.end();
      return;
    }

    if (!url.pathname.startsWith(basePath)) {
      sendNotFound(response);
      return;
    }

    const relativePath =
      url.pathname === basePath
        ? "index.html"
        : decodeURIComponent(url.pathname.slice(basePath.length));
    const normalizedPath = path.normalize(relativePath);
    if (
      normalizedPath.startsWith("..") ||
      path.isAbsolute(normalizedPath)
    ) {
      sendNotFound(response);
      return;
    }

    const absolutePath = path.join(distDirectory, normalizedPath);
    const data = await fs.readFile(absolutePath);
    const contentType =
      contentTypes.get(path.extname(absolutePath)) ??
      "application/octet-stream";
    response.writeHead(200, {
      "Content-Type": contentType,
      "Cache-Control": "no-cache",
    });
    response.end(data);
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      sendNotFound(response);
      return;
    }
    console.error(error);
    response.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Internal server error");
  }
});

server.listen(port, host, () => {
  console.log(`GitHub Pages preview: http://${host}:${port}${basePath}`);
});

function sendNotFound(response) {
  response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  response.end("Not found");
}

