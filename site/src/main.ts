import "./styles.css";
import type { ExperienceSnapshot } from "./scene/Experience";

declare global {
  interface Window {
    __MICROSOFT_50__?: {
      getSnapshot: () => ExperienceSnapshot;
      dispose: () => void;
    };
  }
}

const canvas = document.querySelector<HTMLCanvasElement>("#experience-canvas");
const loadingStatus = document.querySelector<HTMLElement>("#loading-status");

if (!canvas || !loadingStatus) {
  throw new Error("The experience shell is incomplete.");
}

void startExperience(canvas, loadingStatus);

async function startExperience(
  targetCanvas: HTMLCanvasElement,
  status: HTMLElement,
): Promise<void> {
  try {
    const { Experience } = await import("./scene/Experience");
    const experience = await Experience.create(
      targetCanvas,
      (completed, total) => {
        status.textContent =
          `Assembling the particle field ${completed} / ${total}`;
      },
    );

    experience.start();
    document.body.classList.add("is-webgl-ready");
    status.textContent = "Particle field ready.";
    window.__MICROSOFT_50__ = {
      getSnapshot: () => experience.getSnapshot(),
      dispose: () => experience.dispose(),
    };
  } catch (error) {
    console.error(error);
    document.body.classList.add("is-webgl-unavailable");
    status.textContent =
      "The interactive field is unavailable, but the complete timeline remains readable.";
  }
}
