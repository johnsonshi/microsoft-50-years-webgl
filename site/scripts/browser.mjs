import { chromium } from "playwright-core";

export const chromePath =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

export async function openExperience(options = {}) {
  const {
    baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:4173/",
    viewport = { width: 1440, height: 900 },
    reducedMotion = "no-preference",
    isMobile = false,
    hasTouch = isMobile,
    deviceScaleFactor = isMobile ? 3 : 2,
  } = options;

  const browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: ["--hide-scrollbars"],
  });
  const context = await browser.newContext({
    viewport,
    reducedMotion,
    isMobile,
    hasTouch,
    deviceScaleFactor,
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const failedRequests = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    consoleErrors.push(error.stack ?? error.message);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      failedRequests.push(`${response.status()} ${response.url()}`);
    }
  });
  page.on("requestfailed", (request) => {
    failedRequests.push(
      `${request.failure()?.errorText ?? "failed"} ${request.url()}`,
    );
  });

  await page.goto(baseUrl, { waitUntil: "networkidle" });
  await page.waitForFunction(
    () => window.__MICROSOFT_50__?.getSnapshot().ready === true,
    undefined,
    { timeout: 60_000 },
  );

  return {
    browser,
    context,
    page,
    consoleErrors,
    failedRequests,
  };
}

export async function setTimelineProgress(page, progress, settleMs = 850) {
  await page.evaluate((value) => {
    const section = document.querySelector("#timeline");
    const firstEra = section?.querySelector(".era:first-child");
    const lastEra = section?.querySelector(".era:last-child");
    if (
      !(section instanceof HTMLElement) ||
      !(firstEra instanceof HTMLElement) ||
      !(lastEra instanceof HTMLElement)
    ) {
      throw new Error("Timeline bounds not found.");
    }
    const sectionTop =
      window.scrollY + firstEra.getBoundingClientRect().top;
    const lastEraBottom =
      window.scrollY + lastEra.getBoundingClientRect().bottom;
    const range = Math.max(
      1,
      lastEraBottom - sectionTop - window.innerHeight,
    );
    window.scrollTo(0, sectionTop + range * value);
  }, progress);
  await page.waitForTimeout(settleMs);
}

export async function getSnapshot(page) {
  return page.evaluate(() => {
    const debug = window.__MICROSOFT_50__;
    if (!debug) {
      throw new Error("Experience diagnostics are unavailable.");
    }
    return debug.getSnapshot();
  });
}
