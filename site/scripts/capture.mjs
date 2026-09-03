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
const outputDirectory = path.join(siteDirectory, "screenshots");
await fs.mkdir(outputDirectory, { recursive: true });

const desktop = await openExperience();
const samples = [];

try {
  for (let index = 0; index < 8; index += 1) {
    const progress = index / 7;
    await setTimelineProgress(desktop.page, progress);
    const snapshot = await getSnapshot(desktop.page);
    samples.push({ name: `scene-${index}`, progress, snapshot });
    await desktop.page.screenshot({
      path: path.join(
        outputDirectory,
        `scene-${String(index + 1).padStart(2, "0")}.jpg`,
      ),
      type: "jpeg",
      quality: 88,
    });

    if (index < 7) {
      const transitionProgress = (index + 0.5) / 7;
      await setTimelineProgress(desktop.page, transitionProgress);
      const transitionSnapshot = await getSnapshot(desktop.page);
      samples.push({
        name: `transition-${index}-${index + 1}`,
        progress: transitionProgress,
        snapshot: transitionSnapshot,
      });
      await desktop.page.screenshot({
        path: path.join(
          outputDirectory,
          `transition-${String(index + 1).padStart(2, "0")}-${String(index + 2).padStart(2, "0")}.jpg`,
        ),
        type: "jpeg",
        quality: 84,
      });
    }
  }
} finally {
  await desktop.browser.close();
}

const mobile = await openExperience({
  viewport: { width: 390, height: 844 },
  isMobile: true,
});

try {
  for (const [name, progress] of [
    ["mobile-origin", 0],
    ["mobile-fifty", 6 / 7],
    ["mobile-future", 1],
  ]) {
    await setTimelineProgress(mobile.page, progress);
    const snapshot = await getSnapshot(mobile.page);
    samples.push({ name, progress, snapshot });
    await mobile.page.screenshot({
      path: path.join(outputDirectory, `${name}.jpg`),
      type: "jpeg",
      quality: 86,
    });
  }
} finally {
  await mobile.browser.close();
}

await fs.writeFile(
  path.join(outputDirectory, "capture-metrics.json"),
  `${JSON.stringify(samples, null, 2)}\n`,
);

console.log(`Captured ${samples.length} states in ${outputDirectory}`);

