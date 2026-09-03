import { centered, type RandomSource } from "./random";
import {
  writePoint,
  type PointSampler,
  type Vec3,
} from "./samplers";

export interface TextSamplerOptions {
  center: Vec3;
  width: number;
  height: number;
  depth: number;
  weight?: number;
  family?: string;
  scanStep?: number;
}

export function textSampler(
  text: string,
  options: TextSamplerOptions,
): PointSampler {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    throw new Error("A 2D canvas context is required to generate text geometry.");
  }

  const family =
    options.family ??
    '"Arial Black", "Segoe UI", Helvetica, Arial, sans-serif';
  const weight = options.weight ?? 800;
  let fontSize = 390;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#fff";

  do {
    context.font = `${weight} ${fontSize}px ${family}`;
    if (context.measureText(text).width <= canvas.width * 0.9) {
      break;
    }
    fontSize -= 8;
  } while (fontSize > 48);

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.fillText(text, canvas.width / 2, canvas.height / 2 + fontSize * 0.035);

  const pixels = collectPixels(
    context,
    canvas.width,
    canvas.height,
    options.scanStep ?? 3,
  );

  if (pixels.length === 0) {
    throw new Error(`Text geometry for "${text}" produced no pixels.`);
  }

  return (random, output, offset) => {
    writeTextPoint(random, output, offset, pixels, canvas, options);
  };
}

function collectPixels(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  step: number,
): Uint16Array {
  const image = context.getImageData(0, 0, width, height).data;
  const values: number[] = [];

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      if (image[(y * width + x) * 4 + 3] > 80) {
        values.push(x, y);
      }
    }
  }

  return Uint16Array.from(values);
}

function writeTextPoint(
  random: RandomSource,
  output: Float32Array,
  offset: number,
  pixels: Uint16Array,
  canvas: HTMLCanvasElement,
  options: TextSamplerOptions,
): void {
  const pointIndex =
    Math.floor(random() * (pixels.length / 2)) * 2;
  const pixelX = pixels[pointIndex];
  const pixelY = pixels[pointIndex + 1];
  const normalizedX = pixelX / canvas.width - 0.5;
  const normalizedY = 0.5 - pixelY / canvas.height;
  const pixelJitterX = options.width / canvas.width * 3;
  const pixelJitterY = options.height / canvas.height * 3;

  writePoint(
    output,
    offset,
    options.center[0] +
      normalizedX * options.width +
      centered(random, pixelJitterX),
    options.center[1] +
      normalizedY * options.height +
      centered(random, pixelJitterY),
    options.center[2] + centered(random, options.depth),
  );
}

