import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  getSnapshot,
  openExperience,
  setTimelineProgress,
} from "./browser.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const siteDirectory = path.resolve(scriptDirectory, "..");
const outputDirectory = path.join(siteDirectory, "performance");
const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:4173/";
const results = [];

await fs.mkdir(outputDirectory, { recursive: true });

for (const particleCount of [25_000, 50_000, 100_000]) {
  const separator = baseUrl.includes("?") ? "&" : "?";
  const startedAt = performance.now();
  const session = await openExperience({
    baseUrl: `${baseUrl}${separator}particles=${particleCount}`,
  });
  const readyMs = performance.now() - startedAt;

  try {
    const cdp = await session.context.newCDPSession(session.page);
    await cdp.send("Performance.enable");

    await setTimelineProgress(session.page, 0, 250);
    await session.page.evaluate(async () => {
      const section = document.querySelector("#timeline");
      if (!(section instanceof HTMLElement)) {
        throw new Error("Timeline section not found.");
      }
      const start = section.offsetTop;
      const range = Math.max(1, section.offsetHeight - window.innerHeight);
      const duration = 5_000;
      const began = performance.now();

      await new Promise((resolve) => {
        const step = (now) => {
          const progress = Math.min(1, (now - began) / duration);
          window.scrollTo(0, start + range * progress);
          if (progress < 1) {
            requestAnimationFrame(step);
          } else {
            resolve();
          }
        };
        requestAnimationFrame(step);
      });
    });
    await session.page.waitForTimeout(900);

    const snapshot = await getSnapshot(session.page);
    const performanceMetrics = await cdp.send("Performance.getMetrics");
    const metrics = Object.fromEntries(
      performanceMetrics.metrics.map(({ name, value }) => [name, value]),
    );
    const webgl = await session.page.locator("canvas").evaluate((canvas) => {
      const context = canvas.getContext("webgl2");
      if (!context) {
        return { version: "unavailable", renderer: "unavailable" };
      }
      const debug = context.getExtension("WEBGL_debug_renderer_info");
      return {
        version: context.getParameter(context.VERSION),
        renderer: debug
          ? context.getParameter(debug.UNMASKED_RENDERER_WEBGL)
          : context.getParameter(context.RENDERER),
        drawingBufferWidth: context.drawingBufferWidth,
        drawingBufferHeight: context.drawingBufferHeight,
      };
    });

    results.push({
      particleCount,
      readyMs,
      estimatedFps:
        snapshot.meanFrameMs > 0 ? 1000 / snapshot.meanFrameMs : 0,
      snapshot,
      jsHeapUsedBytes: metrics.JSHeapUsedSize ?? null,
      jsHeapTotalBytes: metrics.JSHeapTotalSize ?? null,
      taskDurationSeconds: metrics.TaskDuration ?? null,
      scriptDurationSeconds: metrics.ScriptDuration ?? null,
      layoutCount: metrics.LayoutCount ?? null,
      webgl,
      consoleErrors: session.consoleErrors,
      failedRequests: session.failedRequests,
    });
  } finally {
    await session.browser.close();
  }
}

const productionAssets = await collectFiles(path.join(siteDirectory, "dist"));
const report = {
  capturedAt: new Date().toISOString(),
  viewport: { width: 1440, height: 900, deviceScaleFactor: 2 },
  browser: "Installed Google Chrome via playwright-core",
  profiles: results,
  productionAssets,
};

await fs.writeFile(
  path.join(outputDirectory, "profile-results.json"),
  `${JSON.stringify(report, null, 2)}\n`,
);

console.log(JSON.stringify(report, null, 2));

async function collectFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(absolutePath));
    } else {
      const stats = await fs.stat(absolutePath);
      files.push({
        path: path.relative(siteDirectory, absolutePath),
        bytes: stats.size,
      });
    }
  }
  return files.sort((left, right) => left.path.localeCompare(right.path));
}

