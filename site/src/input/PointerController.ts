import { clamp, lerp } from "../utils/math";

export class PointerController {
  currentX = 0;
  currentY = 0;

  private targetX = 0;
  private targetY = 0;
  private readonly reducedMotion: boolean;

  constructor(reducedMotion: boolean) {
    this.reducedMotion = reducedMotion;
    window.addEventListener("pointermove", this.handlePointerMove, {
      passive: true,
    });
    window.addEventListener("pointerleave", this.reset, { passive: true });
    window.addEventListener("blur", this.reset, { passive: true });
  }

  update(deltaSeconds: number): void {
    if (this.reducedMotion) {
      this.currentX = 0;
      this.currentY = 0;
      return;
    }

    const alpha = 1 - Math.exp(-7.5 * deltaSeconds);
    this.currentX = lerp(this.currentX, this.targetX, alpha);
    this.currentY = lerp(this.currentY, this.targetY, alpha);
  }

  dispose(): void {
    window.removeEventListener("pointermove", this.handlePointerMove);
    window.removeEventListener("pointerleave", this.reset);
    window.removeEventListener("blur", this.reset);
  }

  private readonly handlePointerMove = (event: PointerEvent): void => {
    if (this.reducedMotion || !event.isPrimary) {
      return;
    }

    this.targetX = clamp(event.clientX / window.innerWidth * 2 - 1, -1, 1);
    this.targetY = clamp(event.clientY / window.innerHeight * 2 - 1, -1, 1);
  };

  private readonly reset = (): void => {
    this.targetX = 0;
    this.targetY = 0;
  };
}

