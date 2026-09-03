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
  await desktop.page.evaluate(() => window.scrollTo(0, 0));
  await desktop.page.waitForTimeout(250);
  await desktop.page.screenshot({
    path: path.join(outputDirectory, "intro.jpg"),
    type: "jpeg",
    quality: 88,
  });

  await desktop.page.evaluate(() => {
    const section = document.querySelector("#timeline");
    const firstEra = section?.querySelector(".era:first-child");
    if (
      !(section instanceof HTMLElement) ||
      !(firstEra instanceof HTMLElement)
    ) {
      throw new Error("Timeline entry bounds not found.");
    }
    const sectionTop =
      window.scrollY + section.getBoundingClientRect().top;
    const firstEraTop =
      window.scrollY + firstEra.getBoundingClientRect().top;
    window.scrollTo(0, sectionTop + (firstEraTop - sectionTop) * 0.5);
  });
  await desktop.page.waitForTimeout(300);
  await desktop.page.screenshot({
    path: path.join(outputDirectory, "timeline-entry.jpg"),
    type: "jpeg",
    quality: 88,
  });

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

  await setTimelineProgress(desktop.page, 1, 200);
  await desktop.page.evaluate(() => {
    const section = document.querySelector("#timeline");
    const lastEra = section?.querySelector(".era:last-child");
    if (
      !(section instanceof HTMLElement) ||
      !(lastEra instanceof HTMLElement)
    ) {
      throw new Error("Timeline bounds not found.");
    }
    const activeEnd =
      window.scrollY +
      lastEra.getBoundingClientRect().bottom -
      window.innerHeight;
    window.scrollTo(0, activeEnd + window.innerHeight * 0.23);
  });
  await desktop.page.waitForTimeout(180);
  await desktop.page.screenshot({
    path: path.join(outputDirectory, "timeline-exit-hold.jpg"),
    type: "jpeg",
    quality: 86,
  });
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
