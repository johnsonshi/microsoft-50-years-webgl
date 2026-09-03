import assert from "node:assert/strict";
import {
  getSnapshot,
  openExperience,
  setTimelineProgress,
} from "./browser.mjs";

const desktop = await openExperience();

try {
  const removedChromeCount = await desktop.page
    .locator(
      ".intro__footer, .stage-status, .stage-meter, .era-copy__index",
    )
    .count();
  assert.equal(removedChromeCount, 0);

  const firstCopyBeforeTimeline = await desktop.page
    .locator(".era-copy")
    .first()
    .evaluate((element) => Number.parseFloat(getComputedStyle(element).opacity));
  assert.ok(
    firstCopyBeforeTimeline < 0.01,
    "The first era is visible above the fold.",
  );

  for (let index = 0; index < 8; index += 1) {
    const progress = index / 7;
    await setTimelineProgress(desktop.page, progress, 500);
    const snapshot = await getSnapshot(desktop.page);
    assert.equal(snapshot.ready, true);
    assert.equal(snapshot.particleCount, 90_000);
    assert.ok(
      Math.abs(snapshot.scrollProgress - progress) < 0.012,
      `Scene ${index} did not settle at ${progress}.`,
    );
    assert.equal(snapshot.drawCalls, 1);
  }

  await setTimelineProgress(desktop.page, 0, 850);
  const firstCopyAtTimeline = await desktop.page
    .locator(".era-copy")
    .first()
    .evaluate((element) => Number.parseFloat(getComputedStyle(element).opacity));
  assert.ok(firstCopyAtTimeline > 0.95);

  for (let index = 6; index >= 0; index -= 1) {
    const progress = index / 7;
    await setTimelineProgress(desktop.page, progress, 450);
    const snapshot = await getSnapshot(desktop.page);
    assert.ok(Math.abs(snapshot.scrollProgress - progress) < 0.015);
  }

  for (let index = 0; index < 7; index += 1) {
    const progress = (index + 0.5) / 7;
    await setTimelineProgress(desktop.page, progress, 550);
    const snapshot = await getSnapshot(desktop.page);
    assert.equal(snapshot.sceneA, index);
    assert.equal(snapshot.sceneB, index + 1);
    assert.ok(
      snapshot.morphProgress > 0.42 && snapshot.morphProgress < 0.58,
      `Transition ${index} was not held near its midpoint.`,
    );
  }

  await setTimelineProgress(desktop.page, 3.25 / 7);
  await desktop.page.mouse.move(30, 450);
  await desktop.page.waitForTimeout(700);
  const left = await getSnapshot(desktop.page);
  await desktop.page.mouse.move(1410, 450);
  await desktop.page.waitForTimeout(900);
  const right = await getSnapshot(desktop.page);
  assert.ok(left.pointerX < -0.75);
  assert.ok(right.pointerX > 0.75);

  await desktop.page.mouse.move(720, 30);
  await desktop.page.waitForTimeout(700);
  const top = await getSnapshot(desktop.page);
  await desktop.page.mouse.move(720, 870);
  await desktop.page.waitForTimeout(900);
  const bottom = await getSnapshot(desktop.page);
  assert.ok(top.pointerY < -0.7);
  assert.ok(bottom.pointerY > 0.7);

  await desktop.page.mouse.move(720, 450);
  const beforeIdle = await getSnapshot(desktop.page);
  await desktop.page.waitForTimeout(2200);
  const afterIdle = await getSnapshot(desktop.page);
  assert.equal(afterIdle.sceneA, beforeIdle.sceneA);
  assert.equal(afterIdle.sceneB, beforeIdle.sceneB);
  assert.ok(afterIdle.cumulativeFrames > beforeIdle.cumulativeFrames + 90);

  await desktop.page.setViewportSize({ width: 1024, height: 768 });
  await desktop.page.waitForTimeout(300);
  const resizedCanvas = await desktop.page.locator("canvas").evaluate((canvas) => ({
    cssWidth: canvas.clientWidth,
    cssHeight: canvas.clientHeight,
    width: canvas.width,
    height: canvas.height,
  }));
  assert.equal(resizedCanvas.cssWidth, 1024);
  assert.equal(resizedCanvas.cssHeight, 768);
  assert.ok(resizedCanvas.width >= resizedCanvas.cssWidth);

  await desktop.page.setViewportSize({ width: 1440, height: 900 });
  await setTimelineProgress(desktop.page, 0.46);
  await desktop.page.reload({ waitUntil: "networkidle" });
  await desktop.page.waitForFunction(
    () => window.__MICROSOFT_50__?.getSnapshot().ready === true,
    undefined,
    { timeout: 60_000 },
  );
  await desktop.page.waitForTimeout(600);
  const restored = await getSnapshot(desktop.page);
  assert.ok(
    restored.scrollProgress > 0.3,
    "Reload did not preserve a useful mid-page scroll position.",
  );

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
  await desktop.page.waitForTimeout(150);
  const exitState = await desktop.page.evaluate(() => {
    const copy = document.querySelector(".era:last-child .era-copy");
    const stage = document.querySelector(".experience-stage");
    if (!(copy instanceof HTMLElement) || !(stage instanceof HTMLElement)) {
      throw new Error("Exit elements not found.");
    }
    return {
      copyOpacity: Number.parseFloat(getComputedStyle(copy).opacity),
      stageTop: stage.getBoundingClientRect().top,
    };
  });
  assert.ok(exitState.copyOpacity < 0.03);
  assert.ok(Math.abs(exitState.stageTop) < 2);

  assert.deepEqual(desktop.consoleErrors, []);
  assert.deepEqual(desktop.failedRequests, []);
} finally {
  await desktop.browser.close();
}

const mobile = await openExperience({
  viewport: { width: 390, height: 844 },
  isMobile: true,
});

try {
  await setTimelineProgress(mobile.page, 1);
  const snapshot = await getSnapshot(mobile.page);
  assert.equal(snapshot.particleCount, 28_000);
  assert.equal(snapshot.sceneA, 7);
  assert.equal(snapshot.sceneB, 7);
  assert.deepEqual(mobile.consoleErrors, []);
  assert.deepEqual(mobile.failedRequests, []);
} finally {
  await mobile.browser.close();
}

const reduced = await openExperience({
  reducedMotion: "reduce",
});

try {
  await setTimelineProgress(reduced.page, 2.6 / 7, 100);
  const snapshot = await getSnapshot(reduced.page);
  assert.equal(snapshot.reducedMotion, true);
  assert.equal(snapshot.sceneA, 3);
  assert.equal(snapshot.sceneB, 3);
  assert.equal(snapshot.morphProgress, 0);
  assert.deepEqual(reduced.consoleErrors, []);
  assert.deepEqual(reduced.failedRequests, []);
} finally {
  await reduced.browser.close();
}

console.log(
  "Interaction checks passed: forward/back scroll, held morphs, pointer, idle, resize, mobile, reduced motion, and reload restoration.",
);
