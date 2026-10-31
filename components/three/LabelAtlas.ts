import { BufferGeometry, CanvasTexture, Float32BufferAttribute, PlaneGeometry, SRGBColorSpace } from "three";

import { formatInactivity, STATUS_COLORS, STATUS_LABELS } from "@/lib/classify";
import { languageMark } from "@/lib/languages";
import type { EnrichedRepo } from "@/lib/types";

// 10 columns at 2:1 on a 2:1 texture gives exactly the 100 cells the render cap needs.
const COLUMNS = 10;
export const LABEL_ASPECT = 0.5;

export interface LabelAtlas {
  texture: CanvasTexture;
  geometries: BufferGeometry[];
  dispose: () => void;
}

function cssFont(variable: string, fallback: string): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value || fallback;
}

function fitFont(
  context: CanvasRenderingContext2D,
  text: string,
  family: string,
  start: number,
  maxWidth: number,
): void {
  let size = start;
  context.font = `${size}px ${family}`;
  while (size > 16 && context.measureText(text).width > maxWidth) {
    size -= 2;
    context.font = `${size}px ${family}`;
  }
}

function drawCell(
  context: CanvasRenderingContext2D,
  repo: EnrichedRepo,
  x: number,
  y: number,
  width: number,
  height: number,
  displayFont: string,
  uiFont: string,
): void {
  const pad = width * 0.05;
  const center = x + width / 2;
  const scale = width / 409;

  context.fillStyle = "rgba(11, 12, 24, 0.86)";
  context.strokeStyle = "rgba(216, 200, 163, 0.42)";
  context.lineWidth = 2 * scale;
  context.beginPath();
  context.roundRect(x + 3, y + 3, width - 6, height - 6, 8 * scale);
  context.fill();
  context.stroke();

  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillStyle = "#F0E6CC";
  fitFont(context, repo.name, displayFont, Math.round(56 * scale), width - pad * 2);
  context.fillText(repo.name, center, y + height * 0.27);

  context.fillStyle = STATUS_COLORS[repo.status];
  context.font = `700 ${Math.round(29 * scale)}px ${uiFont}`;
  context.fillText(
    `${STATUS_LABELS[repo.status]}, pushed ${formatInactivity(repo.inactiveDays)}`,
    center,
    y + height * 0.56,
    width - pad * 2,
  );

  const mark = languageMark(repo.language);
  const label = `${repo.language ?? "No language"}${repo.stars > 0 ? `   ★ ${repo.stars.toLocaleString("en-US")}` : ""}`;
  context.font = `${Math.round(27 * scale)}px ${uiFont}`;
  const textWidth = Math.min(context.measureText(label).width, width - pad * 3);
  const dotRadius = 10 * scale;
  const startX = center - (textWidth + dotRadius * 3) / 2;
  const rowY = y + height * 0.8;
  context.fillStyle = mark.color;
  context.beginPath();
  context.arc(startX + dotRadius, rowY, dotRadius, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#CFC6AE";
  context.textAlign = "left";
  context.fillText(label, startX + dotRadius * 3, rowY, width - pad * 3);
}

/** Draws every label onto one texture, so all labels share a single upload. */
export function buildLabelAtlas(repos: readonly EnrichedRepo[], width: number, height: number): LabelAtlas {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d") as CanvasRenderingContext2D;
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 4;

  const cellWidth = width / COLUMNS;
  const cellHeight = cellWidth * LABEL_ASPECT;

  const draw = () => {
    const displayFont = cssFont("--font-display", "Georgia, serif");
    const uiFont = cssFont("--font-ui", "system-ui, sans-serif");
    context.clearRect(0, 0, width, height);
    repos.forEach((repo, index) => {
      drawCell(
        context,
        repo,
        (index % COLUMNS) * cellWidth,
        Math.floor(index / COLUMNS) * cellHeight,
        cellWidth,
        cellHeight,
        displayFont,
        uiFont,
      );
    });
    texture.needsUpdate = true;
  };

  draw();
  // The first draw may use fallback fonts. Redraw once the web fonts arrive.
  let disposed = false;
  void document.fonts.ready.then(() => {
    if (!disposed) draw();
  });

  const geometries = repos.map((_, index) => {
    const geometry = new PlaneGeometry(1, LABEL_ASPECT);
    const left = ((index % COLUMNS) * cellWidth) / width;
    const right = left + cellWidth / width;
    const top = 1 - (Math.floor(index / COLUMNS) * cellHeight) / height;
    const bottom = top - cellHeight / height;
    geometry.setAttribute(
      "uv",
      new Float32BufferAttribute([left, top, right, top, left, bottom, right, bottom], 2),
    );
    return geometry;
  });

  return {
    texture,
    geometries,
    dispose: () => {
      disposed = true;
      texture.dispose();
      geometries.forEach((geometry) => geometry.dispose());
    },
  };
}
