"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";

const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;

type CardExportProps = {
  fileName: string;
  children: React.ReactNode;
};

type BusyAction = "card" | "story" | "share" | null;

export function CardExport({ fileName, children }: CardExportProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<BusyAction>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function captureCardPng() {
    const card = rootRef.current?.querySelector<HTMLElement>(".reward-card");
    if (!card) {
      throw new Error("카드를 찾을 수 없어요.");
    }

    const prevOpacity = card.style.getPropertyValue("--hover-tilt-opacity");
    const prevX = card.style.getPropertyValue("--hover-tilt-x");
    const prevY = card.style.getPropertyValue("--hover-tilt-y");

    card.style.setProperty("--hover-tilt-opacity", "0.85");
    card.style.setProperty("--hover-tilt-x", "0.42");
    card.style.setProperty("--hover-tilt-y", "0.35");

    try {
      return await toPng(card, {
        pixelRatio: 2,
        cacheBust: true,
        style: {
          transform: "none",
        },
      });
    } finally {
      restoreVar(card, "--hover-tilt-opacity", prevOpacity);
      restoreVar(card, "--hover-tilt-x", prevX);
      restoreVar(card, "--hover-tilt-y", prevY);
    }
  }

  async function captureStoryPng() {
    const cardDataUrl = await captureCardPng();
    return composeStoryFrame(cardDataUrl);
  }

  async function downloadCard() {
    setBusy("card");
    setMessage(null);
    try {
      triggerDownload(await captureCardPng(), `${fileName}.png`);
      setMessage("카드 이미지를 저장했어요.");
    } catch {
      setMessage("저장에 실패했어요. 다시 시도해 주세요.");
    } finally {
      setBusy(null);
    }
  }

  async function downloadStory() {
    setBusy("story");
    setMessage(null);
    try {
      triggerDownload(await captureStoryPng(), `${fileName}_story.png`);
      setMessage(
        "스토리용(9:16) 이미지를 저장했어요. 인스타 스토리 → 갤러리에서 고르면 됩니다.",
      );
    } catch {
      setMessage("스토리 이미지 저장에 실패했어요. 다시 시도해 주세요.");
    } finally {
      setBusy(null);
    }
  }

  async function shareStory() {
    setBusy("share");
    setMessage(null);
    try {
      const dataUrl = await captureStoryPng();
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], `${fileName}_story.png`, {
        type: "image/png",
      });

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "내 도장 카드",
          text: "오늘의 도장 카드",
        });
        setMessage("공유 시트에서 인스타그램을 골라 스토리에 올려 보세요.");
        return;
      }

      triggerDownload(dataUrl, `${fileName}_story.png`);
      setMessage(
        "이 기기에서는 공유를 지원하지 않아 스토리용 이미지를 저장했어요.",
      );
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setMessage(null);
      } else {
        setMessage("공유에 실패했어요. 다시 시도해 주세요.");
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card-export">
      <div ref={rootRef} className="card-export__stage">
        {children}
      </div>
      <div className="card-export__actions">
        <button
          type="button"
          className="button"
          disabled={busy !== null}
          onClick={() => void downloadCard()}
        >
          {busy === "card" ? "만드는 중…" : "카드 저장"}
        </button>
        <button
          type="button"
          className="button"
          disabled={busy !== null}
          onClick={() => void downloadStory()}
        >
          {busy === "story" ? "만드는 중…" : "스토리용 저장"}
        </button>
        <button
          type="button"
          className="button button--primary"
          disabled={busy !== null}
          onClick={() => void shareStory()}
        >
          {busy === "share" ? "만드는 중…" : "스토리 공유"}
        </button>
      </div>
      {message ? (
        <p className="card-export__status" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}

function triggerDownload(dataUrl: string, name: string) {
  const link = document.createElement("a");
  link.download = name;
  link.href = dataUrl;
  link.click();
}

function restoreVar(el: HTMLElement, name: string, previous: string) {
  if (previous) {
    el.style.setProperty(name, previous);
  } else {
    el.style.removeProperty(name);
  }
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("이미지를 불러오지 못했어요."));
    image.src = src;
  });
}

function readCssColor(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
  return value || fallback;
}

async function composeStoryFrame(cardDataUrl: string) {
  const card = await loadImage(cardDataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = STORY_WIDTH;
  canvas.height = STORY_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("캔버스를 만들 수 없어요.");
  }

  const bg0 = readCssColor("--background", "#fff9ef");
  const bg1 = readCssColor("--primary-soft", "#f0ebff");
  const ink = readCssColor("--foreground", "#3d3158");
  const muted = readCssColor("--muted", "#756b86");
  const primary = readCssColor("--primary", "#8066e8");

  const gradient = ctx.createLinearGradient(0, 0, STORY_WIDTH, STORY_HEIGHT);
  gradient.addColorStop(0, bg0);
  gradient.addColorStop(0.45, bg1);
  gradient.addColorStop(1, bg0);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);

  drawSoftBlob(ctx, 180, 260, 220, "rgb(255 225 236 / 70%)");
  drawSoftBlob(ctx, 900, 420, 260, "rgb(218 244 231 / 65%)");
  drawSoftBlob(ctx, 240, 1680, 280, "rgb(255 239 172 / 55%)");
  drawSoftBlob(ctx, 860, 1580, 200, "rgb(236 225 255 / 60%)");

  const maxWidth = STORY_WIDTH * 0.78;
  const maxHeight = STORY_HEIGHT * 0.58;
  const scale = Math.min(maxWidth / card.width, maxHeight / card.height);
  const width = card.width * scale;
  const height = card.height * scale;
  const x = (STORY_WIDTH - width) / 2;
  const y = (STORY_HEIGHT - height) / 2 - 60;

  ctx.save();
  ctx.shadowColor = "rgb(79 58 126 / 28%)";
  ctx.shadowBlur = 48;
  ctx.shadowOffsetY = 22;
  roundRect(ctx, x - 8, y - 8, width + 16, height + 16, 36);
  ctx.fillStyle = "rgb(255 255 255 / 35%)";
  ctx.fill();
  ctx.drawImage(card, x, y, width, height);
  ctx.restore();

  const displayFont = readCssColor("--font-jua", "Jua");
  const bodyFont = readCssColor("--font-gowun", "Gowun Dodum");

  ctx.textAlign = "center";
  ctx.fillStyle = ink;
  ctx.font = `400 52px ${displayFont}, sans-serif`;
  ctx.fillText("오늘의 도장 카드", STORY_WIDTH / 2, y + height + 88);

  ctx.fillStyle = muted;
  ctx.font = `400 28px ${bodyFont}, sans-serif`;
  ctx.fillText("도장 스트릭", STORY_WIDTH / 2, y + height + 136);

  ctx.fillStyle = primary;
  ctx.beginPath();
  ctx.arc(STORY_WIDTH / 2, y - 48, 6, 0, Math.PI * 2);
  ctx.fill();

  return canvas.toDataURL("image/png");
}

function drawSoftBlob(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
) {
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, "transparent");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}
