import { clamp, lerp, smootherstep } from "../utils/math";

export interface TimelineState {
  progress: number;
  scaled: number;
  sceneA: number;
  sceneB: number;
  local: number;
  eased: number;
}

export function resolveTimeline(
  progress: number,
  sceneCount: number,
  reducedMotion = false,
): TimelineState {
  const state: TimelineState = {
    progress: 0,
    scaled: 0,
    sceneA: 0,
    sceneB: 0,
    local: 0,
    eased: 0,
  };
  writeTimelineState(state, progress, sceneCount, reducedMotion);
  return state;
}

export class ScrollTimeline {
  readonly state: TimelineState = {
    progress: 0,
    scaled: 0,
    sceneA: 0,
    sceneB: 1,
    local: 0,
    eased: 0,
  };

  private readonly section: HTMLElement;
  private readonly copies: HTMLElement[];
  private readonly year: HTMLElement;
  private readonly progressLabel: HTMLElement;
  private readonly meter: HTMLElement;
  private readonly sceneYears: readonly string[];
  private readonly reducedMotion: boolean;
  private readonly lastPresence: Float32Array;
  private sectionStart = 0;
  private sectionRange = 1;
  private targetProgress = 0;
  private currentProgress = 0;

  constructor(
    section: HTMLElement,
    copies: HTMLElement[],
    year: HTMLElement,
    progressLabel: HTMLElement,
    meter: HTMLElement,
    sceneYears: readonly string[],
    reducedMotion: boolean,
  ) {
    this.section = section;
    this.copies = copies;
    this.year = year;
    this.progressLabel = progressLabel;
    this.meter = meter;
    this.sceneYears = sceneYears;
    this.reducedMotion = reducedMotion;
    this.lastPresence = new Float32Array(copies.length);
    this.lastPresence.fill(-1);

    this.measure();
    this.handleScroll();
    window.addEventListener("scroll", this.handleScroll, { passive: true });
    window.addEventListener("resize", this.handleResize, { passive: true });
  }

  update(deltaSeconds: number): TimelineState {
    if (this.reducedMotion) {
      this.currentProgress = this.targetProgress;
    } else {
      const alpha = 1 - Math.exp(-18 * deltaSeconds);
      this.currentProgress = lerp(
        this.currentProgress,
        this.targetProgress,
        alpha,
      );
      if (Math.abs(this.currentProgress - this.targetProgress) < 0.00001) {
        this.currentProgress = this.targetProgress;
      }
    }

    writeTimelineState(
      this.state,
      this.currentProgress,
      this.copies.length,
      this.reducedMotion,
    );
    this.updateDom();
    return this.state;
  }

  dispose(): void {
    window.removeEventListener("scroll", this.handleScroll);
    window.removeEventListener("resize", this.handleResize);
  }

  private readonly handleScroll = (): void => {
    this.targetProgress = clamp(
      (window.scrollY - this.sectionStart) / this.sectionRange,
      0,
      1,
    );
  };

  private readonly handleResize = (): void => {
    this.measure();
    this.handleScroll();
  };

  private measure(): void {
    const rect = this.section.getBoundingClientRect();
    this.sectionStart = window.scrollY + rect.top;
    this.sectionRange = Math.max(1, this.section.offsetHeight - window.innerHeight);
  }

  private updateDom(): void {
    const activeIndex = Math.min(
      this.sceneYears.length - 1,
      Math.round(this.state.scaled),
    );

    this.year.textContent = this.sceneYears[activeIndex];
    this.progressLabel.textContent =
      `${String(activeIndex + 1).padStart(2, "0")} / ${String(this.sceneYears.length).padStart(2, "0")}`;
    this.meter.style.transform = `scaleX(${this.state.progress.toFixed(5)})`;
    document.body.dataset.sceneIndex = String(activeIndex);

    for (let index = 0; index < this.copies.length; index += 1) {
      const distance = Math.abs(this.state.scaled - index);
      const presence = smootherstep(clamp(1 - distance, 0, 1));
      if (Math.abs(presence - this.lastPresence[index]) > 0.002) {
        this.copies[index].style.setProperty(
          "--scene-presence",
          presence.toFixed(4),
        );
        this.lastPresence[index] = presence;
      }
    }
  }
}

function writeTimelineState(
  state: TimelineState,
  progress: number,
  sceneCount: number,
  reducedMotion: boolean,
): void {
  const clamped = clamp(progress, 0, 1);
  const scaled = clamped * Math.max(0, sceneCount - 1);

  state.progress = clamped;
  state.scaled = scaled;

  if (reducedMotion) {
    const nearest = Math.min(sceneCount - 1, Math.round(scaled));
    state.sceneA = nearest;
    state.sceneB = nearest;
    state.local = 0;
    state.eased = 0;
    return;
  }

  const source = Math.min(sceneCount - 1, Math.floor(scaled));
  if (source >= sceneCount - 1) {
    state.sceneA = sceneCount - 1;
    state.sceneB = sceneCount - 1;
    state.local = 0;
    state.eased = 0;
    return;
  }

  state.sceneA = source;
  state.sceneB = source + 1;
  state.local = scaled - source;
  state.eased = smootherstep(state.local);
}

