"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Upload, 
  Download, 
  Trash2, 
  Ruler, 
  RotateCw, 
  Grid, 
  Sun, 
  Moon, 
  Plus, 
  Minus, 
  Check, 
  AlertCircle,
  Scissors,
  RefreshCw,
  ArrowLeft,
  Crop,
  Layers,
  Sparkles,
  Maximize2,
  Coffee,
  User
} from "lucide-react";

// Types
interface ImageCrop {
  left: number; // 0..100
  right: number; // 0..100
  top: number; // 0..100
  bottom: number; // 0..100
  shape: "rectangle" | "star" | "polygon";
  cornerRadius: number; // mm
  starPoints: number;
  starInnerRatio: number;
  polygonSides: number;
  ratioPreset: "free" | "1:1" | "4:3" | "3:4" | "16:9" | "9:16";
}

interface ImageItem {
  id: string;
  name: string;
  originalSrc: string; // original uploaded image (data URL or blob URL)
  src: string;         // transparent bg-removed or original src
  width: number;       // natural width in pixels
  height: number;      // natural height in pixels
  
  // Configuration settings (in mm internally, refers to full/uncropped physical sizes)
  targetWidth: number;  // target width in mm
  targetHeight: number; // target height in mm
  
  // Crop settings
  crop: ImageCrop;

  // Bounding box cropping (for PNG/bg removed images, applied after crop)
  useImageBounds: boolean;
  bounds: { x: number; y: number; w: number; h: number } | null;
  
  // Placement coordinates (in mm internally, relative to absolute canvas origin 0,0)
  x: number;
  y: number;
  rotation: number;     // 0, 90, 180, 270 degrees
  
  // Flags
  mimeType: string;
  backgroundRemoved: boolean;
}

interface PaperPreset {
  name: string;
  width: number; // in mm
  height: number; // in mm
  displayUnit: "mm" | "in";
}

const PAPER_PRESETS: Record<string, PaperPreset> = {
  A4: { name: "A4 (210 × 297 mm)", width: 210, height: 297, displayUnit: "mm" },
  "US Letter": { name: "US Letter (8.5 × 11 in)", width: 215.9, height: 279.4, displayUnit: "in" },
  A3: { name: "A3 (297 × 420 mm)", width: 297, height: 420, displayUnit: "mm" },
  "US Legal": { name: "US Legal (8.5 × 14 in)", width: 215.9, height: 355.6, displayUnit: "in" },
  A5: { name: "A5 (148 × 210 mm)", width: 148, height: 210, displayUnit: "mm" },
  "Tabloid / Ledger": { name: "Tabloid / Ledger (11 × 17 in)", width: 279.4, height: 431.8, displayUnit: "in" },
  "Standard Index Card": { name: "Standard Index Card (3 × 5 in)", width: 76.2, height: 127, displayUnit: "in" },
  A6: { name: "A6 (105 × 148 mm)", width: 105, height: 148, displayUnit: "mm" },
  "DL Envelope": { name: "DL Envelope (110 × 220 mm)", width: 110, height: 220, displayUnit: "mm" },
  "Large Index Card": { name: "Large Index Card (4 × 6 in)", width: 101.6, height: 152.4, displayUnit: "in" },
  Executive: { name: "Executive (7.25 × 10.5 in)", width: 184.2, height: 266.7, displayUnit: "in" },
  B5: { name: "B5 (176 × 250 mm)", width: 176, height: 250, displayUnit: "mm" },
  A2: { name: "A2 (420 × 594 mm)", width: 420, height: 594, displayUnit: "mm" },
  "C5 Envelope": { name: "C5 Envelope (162 × 229 mm)", width: 162, height: 229, displayUnit: "mm" },
  "Jumbo Index Card": { name: "Jumbo Index Card (5 × 8 in)", width: 127, height: 203.2, displayUnit: "in" },
  A1: { name: "A1 (594 × 841 mm)", width: 594, height: 841, displayUnit: "mm" },
  "Half Letter": { name: "Half Letter (5.5 × 8.5 in)", width: 139.7, height: 215.9, displayUnit: "in" },
  B4: { name: "B4 (250 × 353 mm)", width: 250, height: 353, displayUnit: "mm" },
  "C4 Envelope": { name: "C4 Envelope (229 × 324 mm)", width: 229, height: 324, displayUnit: "mm" },
  A0: { name: "A0 (841 × 1189 mm)", width: 841, height: 1189, displayUnit: "mm" },
  "Arch D": { name: "Arch D (24 × 36 in)", width: 609.6, height: 914.4, displayUnit: "in" },
  "ANSI C": { name: "ANSI C (17 × 22 in)", width: 431.8, height: 558.8, displayUnit: "in" },
  A7: { name: "A7 (74 × 105 mm)", width: 74, height: 105, displayUnit: "mm" },
  B3: { name: "B3 (353 × 500 mm)", width: 353, height: 500, displayUnit: "mm" },
  "Arch E": { name: "Arch E (36 × 48 in)", width: 914.4, height: 1219.2, displayUnit: "in" },
  "ANSI D": { name: "ANSI D (22 × 34 in)", width: 558.8, height: 863.6, displayUnit: "in" },
  B2: { name: "B2 (500 × 707 mm)", width: 500, height: 707, displayUnit: "mm" },
  "C6 Envelope": { name: "C6 Envelope (114 × 162 mm)", width: 114, height: 162, displayUnit: "mm" },
  B1: { name: "B1 (707 × 1000 mm)", width: 707, height: 1000, displayUnit: "mm" },
  A8: { name: "A8 (52 × 74 mm)", width: 52, height: 74, displayUnit: "mm" },
};

// Conversions
const mmToIn = (mm: number) => mm / 25.4;
const inToMm = (inch: number) => inch * 25.4;
const mmToCm = (mm: number) => mm / 10;
const cmToMm = (cm: number) => cm * 10;

// Rendering display scaling factor (1mm = 2.5px in CSS workspace)
const PX_PER_MM = 2.5;

// Human scale reference figure dimensions (in mm)
const PERSON_W = 618;
const PERSON_H = 1800;

const defaultCrop = (): ImageCrop => ({
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
  shape: "rectangle",
  cornerRadius: 0,
  starPoints: 5,
  starInnerRatio: 0.4,
  polygonSides: 5,
  ratioPreset: "free",
});

export default function PlanarApp() {
  // Theme state
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);

  // Unit and layout variables
  const [unit, setUnit] = useState<"mm" | "cm" | "in">("mm");
  const [paperPreset, setPaperPreset] = useState<string>("A4");
  const [paperWidth, setPaperWidth] = useState<number>(210); // in mm
  const [paperHeight, setPaperHeight] = useState<number>(297); // in mm
  const [sheetMargin, setSheetMargin] = useState<number>(5); // in mm (5mm default)
  const gluingMargin = 0; // margins act as overlap directly in dynamic grid tiling
  const [allowRotation, setAllowRotation] = useState<boolean>(false);
  const [showOverlapGuides, setShowOverlapGuides] = useState<boolean>(true);

  // Human scale reference toggle (shown alongside multi-page layouts)
  const [showPerson, setShowPerson] = useState<boolean>(true);

  // Gluing assembly preview (shown after exporting a multi-page PDF)
  const [showGluePreview, setShowGluePreview] = useState<boolean>(false);

  // Workspace states
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(0.8);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [exportFormat, setExportFormat] = useState<"pdf" | "png" | "jpg">("pdf");
  
  // Background removal loading progress
  const [bgRemovalProgress, setBgRemovalProgress] = useState<number | null>(null);
  const [isBgRemovalProcessing, setIsBgRemovalProcessing] = useState<boolean>(false);

  // Calibration state
  const [isCalibrationActive, setIsCalibrationActive] = useState<boolean>(false);
  const [calibrationPoints, setCalibrationPoints] = useState<{ x: number; y: number }[]>([]);
  const [calibrationDistance, setCalibrationDistance] = useState<string>("");

  // Crop mode state
  const [croppingImageId, setCroppingImageId] = useState<string | null>(null);

  // DOM Refs
  const workspaceRef = useRef<HTMLDivElement>(null);
  const pasteboardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ref tracking the zoom state dynamically for scroll/wheel gestures
  const zoomRef = useRef(zoom);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  // Refs to avoid rebuilding window-level event listeners on state changes
  const paperWidthRef = useRef(paperWidth);
  const paperHeightRef = useRef(paperHeight);
  const sheetMarginRef = useRef(sheetMargin);

  useEffect(() => { paperWidthRef.current = paperWidth; }, [paperWidth]);
  useEffect(() => { paperHeightRef.current = paperHeight; }, [paperHeight]);
  useEffect(() => { sheetMarginRef.current = sheetMargin; }, [sheetMargin]);

  // Spacebar pressed tracking for Panning
  const [spacePressed, setSpacePressed] = useState(false);
  const panningInfo = useRef({
    isPanning: false,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });

  const [isPanning, setIsPanning] = useState(false);
  const pendingScrollRef = useRef<{ left: number; top: number } | null>(null);

  // Apply pending scroll alignment after zoom state has rendered in the DOM
  useEffect(() => {
    if (pendingScrollRef.current && workspaceRef.current) {
      workspaceRef.current.scrollLeft = pendingScrollRef.current.left;
      workspaceRef.current.scrollTop = pendingScrollRef.current.top;
      pendingScrollRef.current = null;
    }
  }, [zoom]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName.toLowerCase();
      if (tag === "input" || tag === "select" || tag === "textarea") {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        setSpacePressed(true);
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedImageId) {
          e.preventDefault();
          setImages((prev) => prev.filter((i) => i.id !== selectedImageId));
          setSelectedImageId(null);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setSpacePressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [selectedImageId]);

  const handleWorkspaceMouseDown = (e: React.MouseEvent) => {
    // Start panning on middle-click, or when space is pressed, OR on left-click on any empty canvas area (not an image wrapper)
    const isLeftClickOnEmpty = e.button === 0 && !(e.target as HTMLElement).closest(".image-wrapper") && !(e.target as HTMLElement).closest(".zoom-controls") && !(e.target as HTMLElement).closest(".banner");
    
    if (e.button === 1 || spacePressed || isLeftClickOnEmpty) {
      e.preventDefault();
      const container = workspaceRef.current;
      if (!container) return;

      setIsPanning(true);
      panningInfo.current = {
        isPanning: true,
        startX: e.clientX,
        startY: e.clientY,
        scrollLeft: container.scrollLeft,
        scrollTop: container.scrollTop,
      };

      document.addEventListener("mousemove", handleWorkspaceMouseMove);
      document.addEventListener("mouseup", handleWorkspaceMouseUp);
    }
  };

  const handleWorkspaceMouseMove = (e: MouseEvent) => {
    if (!panningInfo.current.isPanning) return;
    const container = workspaceRef.current;
    if (!container) return;

    const dx = e.clientX - panningInfo.current.startX;
    const dy = e.clientY - panningInfo.current.startY;

    container.scrollLeft = panningInfo.current.scrollLeft - dx;
    container.scrollTop = panningInfo.current.scrollTop - dy;
  };

  const handleWorkspaceMouseUp = () => {
    setIsPanning(false);
    panningInfo.current.isPanning = false;
    document.removeEventListener("mousemove", handleWorkspaceMouseMove);
    document.removeEventListener("mouseup", handleWorkspaceMouseUp);
  };

  // Mouse Drag / Resize / Rotate state
  const dragInfo = useRef<{
    type: "drag" | "resize" | "rotate" | null;
    imageId: string;
    startX: number;
    startY: number;
    initialX: number;
    initialY: number;
    initialWidth: number;
    initialHeight: number;
    initialRotation: number;
  }>({
    type: null,
    imageId: "",
    startX: 0,
    startY: 0,
    initialX: 0,
    initialY: 0,
    initialWidth: 0,
    initialHeight: 0,
    initialRotation: 0,
  });

  // Unified Pointer handler (handles both Mouse and Mobile Touch movements)
  const handleGlobalPointerMove = (clientX: number, clientY: number, shiftKey: boolean) => {
    const info = dragInfo.current;
    if (!info.type || !info.imageId) return;

    const deltaX = (clientX - info.startX) / (zoom * PX_PER_MM);
    const deltaY = (clientY - info.startY) / (zoom * PX_PER_MM);

    setImages((prev) =>
      prev.map((img) => {
        if (img.id !== info.imageId) return img;

        if (info.type === "drag") {
          let newX = info.initialX + deltaX;
          let newY = info.initialY + deltaY;

          const { cols, rows, usableWidth, usableHeight } = getLayoutDimensions();
          newX = Math.max(-50, Math.min(newX, cols * usableWidth + 50));
          newY = Math.max(-50, Math.min(newY, rows * usableHeight + 50));

          return { ...img, x: newX, y: newY };
        } 
        
        if (info.type === "resize") {
          const ratio = info.initialHeight / info.initialWidth;
          const cropRatioW = 1 - (img.crop.left + img.crop.right) / 100;
          const cropRatioH = 1 - (img.crop.top + img.crop.bottom) / 100;

          const visibleDeltaX = deltaX;
          const visibleDeltaY = deltaY;

          let newVisibleW = (info.initialWidth * cropRatioW) + visibleDeltaX;
          let newVisibleH = (info.initialHeight * cropRatioH) + visibleDeltaY;

          newVisibleW = Math.max(10 * cropRatioW, newVisibleW);
          newVisibleH = Math.max(10 * cropRatioH, newVisibleH);

          if (!shiftKey) {
            const visibleRatio = (info.initialHeight * cropRatioH) / (info.initialWidth * cropRatioW);
            if (Math.abs(visibleDeltaX) > Math.abs(visibleDeltaY)) {
              newVisibleH = newVisibleW * visibleRatio;
            } else {
              newVisibleW = newVisibleH / visibleRatio;
            }
          }

          const newFullW = newVisibleW / cropRatioW;
          const newFullH = newVisibleH / cropRatioH;

          return {
            ...img,
            targetWidth: newFullW,
            targetHeight: newFullH,
          };
        }

        if (info.type === "rotate") {
          const imgEl = document.getElementById(`img-wrap-${img.id}`);
          if (!imgEl) return img;

          const rect = imgEl.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;

          const angleRad = Math.atan2(clientY - centerY, clientX - centerX);
          let angleDeg = (angleRad * 180) / Math.PI + 90;

          if (shiftKey) {
            angleDeg = Math.round(angleDeg / 45) * 45;
          } else {
            const nearest90 = Math.round(angleDeg / 90) * 90;
            if (Math.abs(angleDeg - nearest90) < 5) {
              angleDeg = nearest90;
            }
          }

          angleDeg = (angleDeg + 360) % 360;

          return {
            ...img,
            rotation: angleDeg,
          };
        }

        return img;
      })
    );
  };

  const handleGlobalMouseMove = (e: MouseEvent) => {
    handleGlobalPointerMove(e.clientX, e.clientY, e.shiftKey);
  };

  // Mouse Drag Handler
  const handleImageMouseDown = (e: React.MouseEvent, img: ImageItem, actionType: "drag" | "resize" | "rotate") => {
    e.preventDefault();
    e.stopPropagation();
    if (isCalibrationActive || croppingImageId) return;

    setSelectedImageId(img.id);

    dragInfo.current = {
      type: actionType,
      imageId: img.id,
      startX: e.clientX,
      startY: e.clientY,
      initialX: img.x,
      initialY: img.y,
      initialWidth: img.targetWidth,
      initialHeight: img.targetHeight,
      initialRotation: img.rotation,
    };

    document.addEventListener("mousemove", handleGlobalMouseMove);
    document.addEventListener("mouseup", handleGlobalMouseUp);
  };

  // Mobile Touch Drag Handler
  const handleImageTouchStart = (e: React.TouchEvent, img: ImageItem, actionType: "drag" | "resize" | "rotate") => {
    if (isCalibrationActive || croppingImageId) return;
    e.stopPropagation(); // prevent window scrolling/panning gestures

    setSelectedImageId(img.id);

    const touch = e.touches[0];
    dragInfo.current = {
      type: actionType,
      imageId: img.id,
      startX: touch.clientX,
      startY: touch.clientY,
      initialX: img.x,
      initialY: img.y,
      initialWidth: img.targetWidth,
      initialHeight: img.targetHeight,
      initialRotation: img.rotation,
    };

    const handleTouchMove = (moveEvent: TouchEvent) => {
      const moveTouch = moveEvent.touches[0];
      handleGlobalPointerMove(moveTouch.clientX, moveTouch.clientY, false);
    };

    const handleTouchEnd = () => {
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      handleGlobalMouseUp();
    };

    document.addEventListener("touchmove", handleTouchMove, { passive: false });
    document.addEventListener("touchend", handleTouchEnd);
  };

  // Trackpad pinch-to-zoom (smooth, centered on cursor) and scroll panning
  useEffect(() => {
    const container = workspaceRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      // --- Classify the gesture (per-event, no fragile time-based latch) ---
      //
      // Pinch-to-zoom on a trackpad (and Ctrl/Cmd + wheel on a mouse) arrives
      // as a wheel event with ctrlKey/metaKey set by the browser.
      const isPinch = e.ctrlKey || e.metaKey;

      // Physical mouse wheels emit chunky, vertical-only notches. The legacy
      // (but still-present in Chrome/Safari/Firefox) `wheelDeltaY` is an exact
      // multiple of 120 for a real wheel, whereas a trackpad two-finger scroll
      // produces fine-grained values, frequent horizontal deltas, and is never
      // a clean multiple of 120. This is far more reliable than guessing from
      // delta magnitude, which macOS momentum scrolling makes ambiguous.
      const wheelDeltaY = (e as WheelEvent & { wheelDeltaY?: number }).wheelDeltaY;
      const isMouseWheel =
        !isPinch &&
        e.deltaX === 0 &&
        (wheelDeltaY !== undefined && wheelDeltaY !== 0
          ? Math.abs(wheelDeltaY) % 120 === 0
          : e.deltaMode !== 0); // line/page delta mode is mouse-wheel only

      const shouldZoom = isPinch || isMouseWheel;

      if (shouldZoom) {
        // Zoom
        let factor = 1.0;
        if (isPinch) {
          // Trackpad pinch-to-zoom: continuous and smooth
          const zoomDelta = -e.deltaY * 0.012;
          factor = Math.exp(zoomDelta);
        } else {
          // Mouse wheel scroll zoom:
          // Normalize scroll steps. Standard notch is ~120, so we scale it.
          // We want one notch (120) to zoom by ~10% (1.1x or 0.9x)
          const scrollSteps = e.deltaY / 120;
          const clampedSteps = Math.min(1.5, Math.max(-1.5, scrollSteps));
          const zoomDelta = -clampedSteps * 0.1;
          factor = 1 + zoomDelta;
        }

        const nextZoom = Math.max(0.15, Math.min(3.0, zoomRef.current * factor));

        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const scrollLeft = container.scrollLeft;
        const scrollTop = container.scrollTop;

        // Map mouse coordinates to unzoomed pasteboard space
        const pointX = (scrollLeft + mouseX) / zoomRef.current;
        const pointY = (scrollTop + mouseY) / zoomRef.current;

        setZoom(nextZoom);

        // Defer scroll offset setting to useEffect to prevent browser clipping during state updates
        pendingScrollRef.current = {
          left: pointX * nextZoom - mouseX,
          top: pointY * nextZoom - mouseY,
        };
      } else {
        // Two-finger trackpad panning
        container.scrollLeft += e.deltaX;
        container.scrollTop += e.deltaY;
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => container.removeEventListener("wheel", handleWheel);
    // Depends on `mounted`: the component renders `null` until mounted is true,
    // so on the very first render workspaceRef.current is null. Re-run once the
    // canvas actually exists, otherwise the listener never attaches.
  }, [mounted]);

  // Touch panning and pinch-to-zoom on mobile devices
  useEffect(() => {
    const container = workspaceRef.current;
    if (!container) return;

    let touchStartDist = 0;
    let touchStartZoom = 1;
    let touchStartPanX = 0;
    let touchStartPanY = 0;
    let isTouchPanning = false;
    let touchStartScrollLeft = 0;
    let touchStartScrollTop = 0;
    let touchStartMidX = 0;
    let touchStartMidY = 0;

    const getTouchDist = (t1: Touch, t2: Touch) => {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const getTouchMid = (t1: Touch, t2: Touch) => {
      return {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      };
    };

    const handleTouchStart = (e: TouchEvent) => {
      // Avoid interfering with image dragging/resizing/cropping
      const target = e.target as HTMLElement;
      if (
        target.closest(".image-wrapper") || 
        target.closest(".resize-handle") || 
        target.closest(".rotate-handle") || 
        target.closest(".zoom-controls") || 
        target.closest(".banner")
      ) {
        return;
      }

      if (e.touches.length === 1) {
        // 1-finger touch: start panning
        isTouchPanning = true;
        const touch = e.touches[0];
        touchStartPanX = touch.clientX;
        touchStartPanY = touch.clientY;
        touchStartScrollLeft = container.scrollLeft;
        touchStartScrollTop = container.scrollTop;
      } else if (e.touches.length === 2) {
        // 2-finger touch: start pinch-to-zoom
        isTouchPanning = false;
        const dist = getTouchDist(e.touches[0], e.touches[1]);
        touchStartDist = dist;
        touchStartZoom = zoomRef.current;

        const mid = getTouchMid(e.touches[0], e.touches[1]);
        touchStartMidX = mid.x;
        touchStartMidY = mid.y;
        touchStartScrollLeft = container.scrollLeft;
        touchStartScrollTop = container.scrollTop;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isTouchPanning && e.touches.length === 1) {
        e.preventDefault();
        const touch = e.touches[0];
        const dx = touch.clientX - touchStartPanX;
        const dy = touch.clientY - touchStartPanY;
        container.scrollLeft = touchStartScrollLeft - dx;
        container.scrollTop = touchStartScrollTop - dy;
      } else if (e.touches.length === 2) {
        e.preventDefault();
        const dist = getTouchDist(e.touches[0], e.touches[1]);
        if (dist > 5 && touchStartDist > 5) {
          const scale = dist / touchStartDist;
          const nextZoom = Math.max(0.15, Math.min(3.0, touchStartZoom * scale));

          const rect = container.getBoundingClientRect();
          const mid = getTouchMid(e.touches[0], e.touches[1]);
          const midX = mid.x - rect.left;
          const midY = mid.y - rect.top;

          const pointX = (touchStartScrollLeft + midX) / touchStartZoom;
          const pointY = (touchStartScrollTop + midY) / touchStartZoom;

          setZoom(nextZoom);

          // Defer scroll offset setting to useEffect to prevent browser clipping during state updates
          pendingScrollRef.current = {
            left: pointX * nextZoom - midX,
            top: pointY * nextZoom - midY,
          };
        }
      }
    };

    const handleTouchEnd = () => {
      isTouchPanning = false;
    };

    container.addEventListener("touchstart", handleTouchStart, { passive: false });
    container.addEventListener("touchmove", handleTouchMove, { passive: false });
    container.addEventListener("touchend", handleTouchEnd);

    return () => {
      container.removeEventListener("touchstart", handleTouchStart);
      container.removeEventListener("touchmove", handleTouchMove);
      container.removeEventListener("touchend", handleTouchEnd);
    };
    // See note on the wheel effect: re-run after `mounted` so the listeners
    // attach to the canvas that only exists once the component renders.
  }, [mounted]);

  // Global window drag and drop listener (unconditional image upload in any state)
  useEffect(() => {
    const handleWindowDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(true);
    };

    const handleWindowDragLeave = (e: DragEvent) => {
      if (e.clientX <= 0 || e.clientY <= 0 || e.clientX >= window.innerWidth || e.clientY >= window.innerHeight) {
        setIsDragOver(false);
      }
    };

    const handleWindowDrop = (e: DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        loadImagesFromFiles(e.dataTransfer.files);
      }
    };

    window.addEventListener("dragover", handleWindowDragOver);
    window.addEventListener("dragleave", handleWindowDragLeave);
    window.addEventListener("drop", handleWindowDrop);

    return () => {
      window.removeEventListener("dragover", handleWindowDragOver);
      window.removeEventListener("dragleave", handleWindowDragLeave);
      window.removeEventListener("drop", handleWindowDrop);
    };
  }, []);

  // Paste-to-import: paste an image from the clipboard (a copied image file or
  // a screenshot) anywhere on the page and it is imported as a new image.
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const tag = document.activeElement?.tagName.toLowerCase();
      if (tag === "input" || tag === "select" || tag === "textarea") return;
      if (!e.clipboardData) return;

      // 1) Direct image files / bitmaps on the clipboard.
      const imageFiles = Array.from(e.clipboardData.files).filter((f) =>
        isSupportedImageFile(f)
      );
      if (imageFiles.length > 0) {
        e.preventDefault();
        const list = imageFiles as unknown as FileList;
        loadImagesFromFiles(list);
        return;
      }

      // 2) A pasted URL / text that points at an image.
      const text = e.clipboardData.getData("text/plain").trim();
      if (text && /^https?:\/\/\S+\.(jpe?g|png|gif|webp|avif|bmp|svg|heic|heif|tiff?)(\?\S*)?$/i.test(text)) {
        e.preventDefault();
        try {
          const res = await fetch(text);
          const blob = await res.blob();
          const dataUrl = await blobToDataUrl(blob);
          addImageFromDataUrl(dataUrl, text.split("/").pop() || "pasted-image", blob.type || "image/png");
        } catch (err) {
          console.error("Failed to import pasted image URL:", err);
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hydration fix & Initial Theme
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("planar-theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    } else {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  }, []);

  // Dynamically update favicon based on theme
  useEffect(() => {
    const faviconHref = theme === "light" ? "/favicon-black.png" : "/favicon-white.png";
    let links = document.querySelectorAll("link[rel~='icon']");
    if (links.length > 0) {
      links.forEach((link) => {
        (link as HTMLLinkElement).href = faviconHref;
      });
    } else {
      const link = document.createElement("link");
      link.rel = "icon";
      link.type = "image/png";
      link.href = faviconHref;
      document.getElementsByTagName("head")[0].appendChild(link);
    }
  }, [theme]);

  // Before unload unsaved warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (images.length > 0) {
        e.preventDefault();
        e.returnValue = "Your work may not be saved. Are you sure you want to leave?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [images]);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("planar-theme", nextTheme);
    document.documentElement.setAttribute("data-theme", nextTheme);
  };

  // Unit conversions for display
  const convertMmToActiveUnit = (valMm: number) => {
    if (unit === "in") return mmToIn(valMm);
    if (unit === "cm") return mmToCm(valMm);
    return valMm;
  };

  const convertActiveUnitToMm = (valActive: number) => {
    if (unit === "in") return inToMm(valActive);
    if (unit === "cm") return cmToMm(valActive);
    return valActive;
  };

  const getUnitSymbol = () => {
    if (unit === "in") return "in";
    if (unit === "cm") return "cm";
    return "mm";
  };

  // Preset paper sizes mapping
  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const presetKey = e.target.value;
    setPaperPreset(presetKey);
    if (presetKey !== "custom") {
      const preset = PAPER_PRESETS[presetKey];
      setPaperWidth(preset.width);
      setPaperHeight(preset.height);
    }
  };

  const selectedImage = images.find((img) => img.id === selectedImageId);

  // Helper to compute visible physical dimensions of an image considering its crop
  const getImageVisibleSize = (img: ImageItem) => {
    const visibleW = img.targetWidth * (1 - (img.crop.left + img.crop.right) / 100);
    const visibleH = img.targetHeight * (1 - (img.crop.top + img.crop.bottom) / 100);
    return { w: visibleW, h: visibleH };
  };

  // Helper to compute physical layout bounding box considering crop and rotation
  const getImageLayoutSize = (img: ImageItem) => {
    const visibleW = img.targetWidth * (1 - (img.crop.left + img.crop.right) / 100);
    const visibleH = img.targetHeight * (1 - (img.crop.top + img.crop.bottom) / 100);
    const rad = (img.rotation * Math.PI) / 180;
    const cos = Math.abs(Math.cos(rad));
    const sin = Math.abs(Math.sin(rad));
    return {
      w: visibleW * cos + visibleH * sin,
      h: visibleW * sin + visibleH * cos,
    };
  };

  // Decode any image file (including HEIC/HEIF/TIFF which browsers cannot
  // render natively) into a PNG/JPEG data URL that an <img> can load.
  const decodeImageFile = async (file: File): Promise<string> => {
    const name = file.name.toLowerCase();
    const type = file.type.toLowerCase();

    const isHeic =
      type === "image/heic" ||
      type === "image/heif" ||
      name.endsWith(".heic") ||
      name.endsWith(".heif");

    const isTiff =
      type === "image/tiff" ||
      type === "image/tif" ||
      name.endsWith(".tif") ||
      name.endsWith(".tiff");

    if (isHeic) {
      const heic2any = (await import("heic2any")).default as (opts: {
        blob: Blob;
        toType?: string;
        quality?: number;
      }) => Promise<Blob | Blob[]>;
      const converted = await heic2any({ blob: file, toType: "image/png" });
      const blob = Array.isArray(converted) ? converted[0] : converted;
      return await blobToDataUrl(blob);
    }

    if (isTiff) {
      const UTIF = (await import("utif2")).default as any;
      const buffer = await file.arrayBuffer();
      const ifds = UTIF.decode(buffer);
      UTIF.decodeImage(buffer, ifds[0]);
      const rgba = UTIF.toRGBA8(ifds[0]);
      const canvas = document.createElement("canvas");
      canvas.width = ifds[0].width;
      canvas.height = ifds[0].height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas unavailable for TIFF decode");
      const imageData = ctx.createImageData(canvas.width, canvas.height);
      imageData.data.set(rgba);
      ctx.putImageData(imageData, 0, 0);
      return canvas.toDataURL("image/png");
    }

    // Everything else: JPEG, PNG, WebP, AVIF, GIF, BMP, SVG, etc. — the
    // browser handles these natively via a plain data URL.
    return await blobToDataUrl(file);
  };

  const blobToDataUrl = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

  // Heuristic: does this file look like an image we can handle? We accept the
  // standard MIME prefix, but also fall back to extension sniffing because
  // many systems report an empty or generic type for HEIC/AVIF/TIFF.
  const isSupportedImageFile = (file: File): boolean => {
    if (file.type.startsWith("image/")) return true;
    const name = file.name.toLowerCase();
    return /\.(jpe?g|png|gif|webp|avif|bmp|svg|heic|heif|tiff?|ico)$/.test(name);
  };

  // File loading
  const loadImagesFromFiles = (files: FileList) => {
    Array.from(files).forEach(async (file) => {
      if (!isSupportedImageFile(file)) return;

      let dataUrl: string;
      try {
        dataUrl = await decodeImageFile(file);
      } catch (err) {
        console.error("Failed to decode image:", file.name, err);
        alert(`Could not read image "${file.name}". The format may be unsupported by this browser.`);
        return;
      }

      addImageFromDataUrl(dataUrl, file.name, file.type);
    });
  };

  // Shared image-creation routine used by file uploads, clipboard paste, and
  // the built-in example gallery. Scales the image to fit inside the printable
  // (margin-inset) area and packs it into the layout.
  const addImageFromDataUrl = (dataUrl: string, name: string, type: string) => {
    const img = new Image();
    img.onload = () => {
      const pxToMm = 0.3528;
      let initialW = img.naturalWidth * pxToMm;
      let initialH = img.naturalHeight * pxToMm;

      const pWidth = paperWidthRef.current;
      const pHeight = paperHeightRef.current;
      const sMargin = sheetMarginRef.current;

      const maxWidth = pWidth - 2 * sMargin;
      const maxHeight = pHeight - 2 * sMargin;
      if (initialW > maxWidth || initialH > maxHeight) {
        const ratio = Math.min(maxWidth / initialW, maxHeight / initialH);
        initialW *= ratio;
        initialH *= ratio;
      }

      const newImg: ImageItem = {
        id: Math.random().toString(36).substring(2, 9),
        name,
        originalSrc: dataUrl,
        src: dataUrl,
        width: img.naturalWidth,
        height: img.naturalHeight,
        targetWidth: initialW,
        targetHeight: initialH,
        crop: defaultCrop(),
        useImageBounds: false,
        bounds: null,
        // New images are placed at the usable-area origin; packing keeps
        // everything inside the margins.
        x: 0,
        y: 0,
        rotation: 0,
        mimeType: type,
        backgroundRemoved: false,
      };

      if (type === "image/png") {
        getImageBounds(img).then((bounds) => {
          newImg.bounds = bounds;
          setImages((prev) => distributeImagesList([...prev, newImg]));
        });
      } else {
        setImages((prev) => distributeImagesList([...prev, newImg]));
      }
    };
    img.src = dataUrl;
  };

  // Load one of the bundled example images (served from /public/examples).
  const loadExampleImage = async (fileName: string) => {
    try {
      const res = await fetch(`/examples/${encodeURIComponent(fileName)}`);
      const blob = await res.blob();
      const dataUrl = await blobToDataUrl(blob);
      addImageFromDataUrl(dataUrl, fileName, blob.type || "image/jpeg");
    } catch (err) {
      console.error("Failed to load example image:", fileName, err);
    }
  };

  // Bounding box calculation for PNG transparent borders
  const getImageBounds = (imgElement: HTMLImageElement): Promise<{ x: number; y: number; w: number; h: number } | null> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(null);
      canvas.width = imgElement.naturalWidth;
      canvas.height = imgElement.naturalHeight;
      ctx.drawImage(imgElement, 0, 0);
      try {
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        const w = canvas.width;
        const h = canvas.height;
        
        let minX = w, maxX = 0, minY = h, maxY = 0;
        let found = false;
        
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            const alpha = data[(y * w + x) * 4 + 3];
            if (alpha > 10) {
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
              found = true;
            }
          }
        }
        
        if (!found) resolve(null);
        else resolve({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 });
      } catch (err) {
        console.error("Bounding box reading error:", err);
        resolve(null);
      }
    });
  };

  // Client-side Background Removal (RemBG) - utilizing unpkg CDN for CORS fix on localhost
  const handleRemoveBackground = async (image: ImageItem) => {
    setIsBgRemovalProcessing(true);
    setBgRemovalProgress(0);
    try {
      const { removeBackground } = await import("@imgly/background-removal");
      
      // Track downloaded file sizes to present a smooth, monotonic progress bar
      const downloadedSizes: Record<string, number> = {};
      const expectedSizes: Record<string, number> = {
        "ort-wasm-simd-threaded.wasm": 2.5 * 1024 * 1024,
        "ort-wasm-simd-threaded.jsep.wasm": 2.5 * 1024 * 1024,
        "isnet.onnx": 44 * 1024 * 1024
      };

      const config: any = {
        publicPath: "https://staticimgly.com/@imgly/background-removal-data/1.7.0/dist/",
        debug: true,
        model: "isnet", // Use the high-quality full model for superior edge detection
        progress: (key: string, current: number, total: number) => {
          const fileKey = key.split("/").pop() || key;
          downloadedSizes[fileKey] = current;
          if (total > 0) {
            expectedSizes[fileKey] = total;
          }

          const totalDownloaded = Object.values(downloadedSizes).reduce((a, b) => a + b, 0);
          
          let totalExpected = 0;
          const activeModelKey = "isnet.onnx";
          const activeWasmKey = "ort-wasm-simd-threaded.wasm";

          const keysToSum = [activeWasmKey, activeModelKey];
          keysToSum.forEach(k => {
            totalExpected += expectedSizes[k];
          });

          if (totalExpected === 0) totalExpected = expectedSizes[activeModelKey];

          const pct = Math.min(100, Math.round((totalDownloaded / totalExpected) * 100));
          setBgRemovalProgress(isNaN(pct) ? 0 : pct);
        }
      };

      let blob: Blob;
      if (image.originalSrc.startsWith("data:")) {
        const parts = image.originalSrc.split(",");
        const mime = parts[0].match(/:(.*?);/)?.[1] || "image/png";
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        blob = new Blob([u8arr], { type: mime });
      } else {
        const response = await fetch(image.originalSrc);
        blob = await response.blob();
      }

      const transparentBlob = await removeBackground(blob, config);
      const transparentUrl = URL.createObjectURL(transparentBlob);

      const tempImg = new Image();
      tempImg.onload = () => {
        getImageBounds(tempImg).then((bounds) => {
          setImages((prev) =>
            prev.map((img) =>
              img.id === image.id
                ? {
                    ...img,
                    src: transparentUrl,
                    bounds: bounds,
                    backgroundRemoved: true,
                    useImageBounds: !!bounds,
                  }
                : img
            )
          );
          setIsBgRemovalProcessing(false);
          setBgRemovalProgress(null);
        });
      };
      tempImg.src = transparentUrl;

    } catch (error) {
      console.error("Background removal failed:", error);
      setIsBgRemovalProcessing(false);
      setBgRemovalProgress(null);
      alert("Failed to remove background. Ensure WebAssembly/ONNX is supported in this browser.");
    }
  };

  // Calibration points mapping
  const startCalibration = () => {
    if (!selectedImageId) return;
    setIsCalibrationActive(true);
    setCalibrationPoints([]);
    setCalibrationDistance("");
  };

  const handleCalibrationClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (calibrationPoints.length >= 2) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    const newPoints = [...calibrationPoints, { x, y }];
    setCalibrationPoints(newPoints);
  };

  const applyCalibration = () => {
    if (!selectedImage || calibrationPoints.length < 2 || !calibrationDistance) return;
    const physicalDistInput = parseFloat(calibrationDistance);
    if (isNaN(physicalDistInput) || physicalDistInput <= 0) return;

    const physicalDistMm = convertActiveUnitToMm(physicalDistInput);
    const pt1 = calibrationPoints[0];
    const pt2 = calibrationPoints[1];

    let wPx = selectedImage.width;
    let hPx = selectedImage.height;

    if (selectedImage.useImageBounds && selectedImage.bounds) {
      wPx = selectedImage.bounds.w;
      hPx = selectedImage.bounds.h;
    }

    const x1 = pt1.x * wPx;
    const y1 = pt1.y * hPx;
    const x2 = pt2.x * wPx;
    const y2 = pt2.y * hPx;

    const dx = x2 - x1;
    const dy = y2 - y1;
    const pixelDist = Math.sqrt(dx * dx + dy * dy);
    const scale = physicalDistMm / pixelDist;

    const targetW = selectedImage.width * scale;
    const targetH = selectedImage.height * scale;

    setImages((prev) =>
      prev.map((img) =>
        img.id === selectedImage.id
          ? {
              ...img,
              targetWidth: targetW,
              targetHeight: targetH,
            }
          : img
      )
    );

    setIsCalibrationActive(false);
    setCalibrationPoints([]);
    setCalibrationDistance("");
  };

  // Snap crop preset ratio
  const snapCropToRatio = (img: ImageItem, ratioPreset: ImageCrop["ratioPreset"]): ImageCrop => {
    if (ratioPreset === "free") return img.crop;

    let targetRatio = 1.0;
    if (ratioPreset === "1:1") targetRatio = 1.0;
    else if (ratioPreset === "4:3") targetRatio = 4 / 3;
    else if (ratioPreset === "3:4") targetRatio = 3 / 4;
    else if (ratioPreset === "16:9") targetRatio = 16 / 9;
    else if (ratioPreset === "9:16") targetRatio = 9 / 16;

    const imageRatio = img.width / img.height;
    let left = 0, right = 0, top = 0, bottom = 0;

    if (imageRatio > targetRatio) {
      const pctToKeep = (1 / imageRatio) * targetRatio * 100;
      const cropTotal = 100 - pctToKeep;
      left = parseFloat((cropTotal / 2).toFixed(1));
      right = parseFloat((cropTotal / 2).toFixed(1));
    } else {
      const pctToKeep = (imageRatio / targetRatio) * 100;
      const cropTotal = 100 - pctToKeep;
      top = parseFloat((cropTotal / 2).toFixed(1));
      bottom = parseFloat((cropTotal / 2).toFixed(1));
    }

    return {
      ...img.crop,
      left,
      right,
      top,
      bottom,
      ratioPreset,
    };
  };

  const handleCropPresetChange = (preset: ImageCrop["ratioPreset"]) => {
    if (!selectedImage) return;
    const updatedCrop = snapCropToRatio(selectedImage, preset);
    setImages((prev) =>
      prev.map((img) =>
        img.id === selectedImage.id ? { ...img, crop: updatedCrop } : img
      )
    );
  };

  // Clip Path generators
  const getStarClipPath = (crop: ImageCrop) => {
    const coords: string[] = [];
    const angleStep = Math.PI / crop.starPoints;
    let angle = -Math.PI / 2;
    for (let i = 0; i < crop.starPoints * 2; i++) {
      const r = i % 2 === 0 ? 50 : 50 * crop.starInnerRatio;
      const x = 50 + r * Math.cos(angle);
      const y = 50 + r * Math.sin(angle);
      coords.push(`${x.toFixed(1)}% ${y.toFixed(1)}%`);
      angle += angleStep;
    }
    return `polygon(${coords.join(", ")})`;
  };

  const getPolygonClipPath = (crop: ImageCrop) => {
    const coords: string[] = [];
    const angleStep = (2 * Math.PI) / crop.polygonSides;
    let angle = -Math.PI / 2;
    for (let i = 0; i < crop.polygonSides; i++) {
      const x = 50 + 50 * Math.cos(angle);
      const y = 50 + 50 * Math.sin(angle);
      coords.push(`${x.toFixed(1)}% ${y.toFixed(1)}%`);
      angle += angleStep;
    }
    return `polygon(${coords.join(", ")})`;
  };

  const getImageClipPath = (crop: ImageCrop) => {
    if (crop.shape === "rectangle") {
      return `inset(0% 0% 0% 0% round ${crop.cornerRadius * PX_PER_MM}px)`;
    } else if (crop.shape === "star") {
      return getStarClipPath(crop);
    } else if (crop.shape === "polygon") {
      return getPolygonClipPath(crop);
    }
    return "none";
  };

  // Page layout boundaries
  const getLayoutDimensions = () => {
    const usableWidth = paperWidth - 2 * sheetMargin;
    const usableHeight = paperHeight - 2 * sheetMargin;

    if (images.length === 0) {
      return { 
        totalWidth: paperWidth, 
        totalHeight: paperHeight, 
        cols: 1, 
        rows: 1, 
        pagesCount: 1,
        usableWidth,
        usableHeight
      };
    }

    let maxX = 0;
    let maxY = 0;

    images.forEach((img) => {
      const { w: layoutW, h: layoutH } = getImageLayoutSize(img);
      const rightEdge = img.x + layoutW;
      const bottomEdge = img.y + layoutH;
      if (rightEdge > maxX) maxX = rightEdge;
      if (bottomEdge > maxY) maxY = bottomEdge;
    });

    const cols = Math.max(1, Math.ceil(maxX / usableWidth));
    const rows = Math.max(1, Math.ceil(maxY / usableHeight));
    const pagesCount = cols * rows;

    return {
      totalWidth: cols * usableWidth + 2 * sheetMargin,
      totalHeight: rows * usableHeight + 2 * sheetMargin,
      cols,
      rows,
      pagesCount,
      usableWidth,
      usableHeight
    };
  };

  const { totalWidth, totalHeight, cols, rows, pagesCount, usableWidth, usableHeight } = getLayoutDimensions();

  // The human scale figure is only meaningful for multi-sheet (tiled poster)
  // layouts, and can be toggled off. `personOffset` is the horizontal space it
  // reserves to the left of the sheets (figure width + a 20mm gap).
  const personVisible = pagesCount > 1 && showPerson;
  const personOffset = personVisible ? PERSON_W + 20 : 0;

  // When the human figure appears or disappears, glide the camera to reframe
  // both the person and the sheets — quickly, along a curve, never a jump.
  useEffect(() => {
    if (!mounted) return;
    const id = requestAnimationFrame(() => fitToViewport());
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personVisible]);

  // Auto-fit on first mount and whenever the viewport resizes (rotating a
  // phone, resizing the window) so the sheet always fits the workspace panel —
  // essential for the mobile layout where the canvas lives in a short top pane.
  useEffect(() => {
    if (!mounted) return;
    const id = requestAnimationFrame(() => fitToViewport());
    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => fitToViewport(), 120);
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(id);
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // Fit the canvas pasteboard to the available viewport space
  const fitToViewport = () => {
    const container = workspaceRef.current;
    if (!container) return;

    const containerW = container.clientWidth;
    const containerH = container.clientHeight;

    if (containerW > 0 && containerH > 0) {
      // Horizontal framing accounts for both the sheets AND the human figure
      // width so the person and the paper both fit in view. Vertical framing
      // deliberately considers ONLY the paper height (not the figure height) —
      // the person may extend above/below the view, but the paper is always
      // fully framed and never pushed off-centre by the tall figure.
      const neededW = (totalWidth + personOffset + 80) * PX_PER_MM;
      const neededH = (totalHeight + 80) * PX_PER_MM;
      const zoomW = containerW / neededW;
      const zoomH = containerH / neededH;
      // Fit to screen with a 8% safety margin
      const nextZoom = Math.max(0.12, Math.min(3.0, Math.min(zoomW, zoomH) * 0.92));

      const targetScroll = {
        left: (neededW * nextZoom - containerW) / 2,
        top: (neededH * nextZoom - containerH) / 2,
      };

      animateCamera(nextZoom, targetScroll);
    }
  };

  // Smoothly ease the camera (zoom + scroll) to a target instead of snapping.
  // Used by "Fit" and whenever the framing changes (e.g. the person appears),
  // so the view glides into place along a curve rather than jumping.
  const cameraAnimRef = useRef<number | null>(null);
  const animateCamera = (targetZoom: number, targetScroll: { left: number; top: number }) => {
    const container = workspaceRef.current;
    if (!container) return;

    if (cameraAnimRef.current !== null) {
      cancelAnimationFrame(cameraAnimRef.current);
      cameraAnimRef.current = null;
    }

    const startZoom = zoomRef.current;
    const startLeft = container.scrollLeft;
    const startTop = container.scrollTop;
    const duration = 320; // ms
    const startTime = performance.now();
    // easeOutCubic — fast departure, gentle settle
    const ease = (t: number) => 1 - Math.pow(1 - t, 3);

    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / duration);
      const k = ease(t);

      const z = startZoom + (targetZoom - startZoom) * k;
      setZoom(z);

      // Glide the scroll offset along with the eased zoom. Both endpoints are
      // valid positions at their own zoom levels; the eased blend reads as one
      // continuous curved camera move.
      const left = startLeft + (targetScroll.left - startLeft) * k;
      const top = startTop + (targetScroll.top - startTop) * k;
      pendingScrollRef.current = { left, top };
      container.scrollLeft = left;
      container.scrollTop = top;

      if (t < 1) {
        cameraAnimRef.current = requestAnimationFrame(step);
      } else {
        cameraAnimRef.current = null;
      }
    };

    cameraAnimRef.current = requestAnimationFrame(step);
  };

  // Distribute packing algorithm
  const distributeImagesList = (items: ImageItem[]): ImageItem[] => {
    if (items.length === 0) return items;

    const spacing = 10; // 10mm gap between packed images
    const usableWidth = paperWidth - 2 * sheetMargin;
    
    // Calculate layout sizes for all items
    const itemsWithSize = items.map(img => {
      const { w, h } = getImageLayoutSize(img);
      return { img, w, h };
    });

    // Shelf width is bounded by A4 printable width or the widest image
    const maxImgW = Math.max(...itemsWithSize.map(x => x.w));
    const shelfWidth = Math.max(usableWidth, maxImgW);

    // Sort by height descending to pack taller items first
    const sorted = [...itemsWithSize].sort((a, b) => b.h - a.h);

    const placed: ImageItem[] = [];
    let currentX = 0;
    let currentY = 0;
    let currentShelfHeight = 0;

    sorted.forEach((item) => {
      // Start a new shelf if the item exceeds shelfWidth
      if (currentX + item.w > shelfWidth + 0.1 && currentX > 0) {
        currentX = 0;
        currentY += currentShelfHeight + spacing;
        currentShelfHeight = 0;
      }

      placed.push({
        ...item.img,
        x: currentX,
        y: currentY,
      });

      currentShelfHeight = Math.max(currentShelfHeight, item.h);
      currentX += item.w + spacing;
    });

    return placed;
  };

  const handleGlobalMouseUp = () => {
    dragInfo.current = {
      type: null,
      imageId: "",
      startX: 0,
      startY: 0,
      initialX: 0,
      initialY: 0,
      initialWidth: 0,
      initialHeight: 0,
      initialRotation: 0,
    };
    document.removeEventListener("mousemove", handleGlobalMouseMove);
    document.removeEventListener("mouseup", handleGlobalMouseUp);
  };

  const handleZoomIn = () => setZoom((z) => Math.min(3.0, z + 0.1));
  const handleZoomOut = () => setZoom((z) => Math.max(0.15, z - 0.1));
  const handleZoomReset = () => fitToViewport();

  const startCropping = (id: string) => {
    setSelectedImageId(id);
    setCroppingImageId(id);
  };

  const stopCropping = () => {
    setCroppingImageId(null);
  };

  // Export functions
  const triggerExport = async () => {
    if (images.length === 0) return alert("Upload images to export.");

    const { pagesCount: numPages } = getLayoutDimensions();

    if (exportFormat === "pdf") {
      const { jsPDF } = await import("jspdf");
      
      const doc = new jsPDF({
        orientation: paperWidth > paperHeight ? "landscape" : "portrait",
        unit: "mm",
        format: [paperWidth, paperHeight],
      });

      for (let i = 0; i < numPages; i++) {
        if (i > 0) doc.addPage([paperWidth, paperHeight]);
        const pageCanvas = await generatePageCanvas(i);
        const dataUrl = pageCanvas.toDataURL("image/png");
        doc.addImage(dataUrl, "PNG", 0, 0, paperWidth, paperHeight, undefined, "FAST");
      }

      doc.save(`planar-${paperPreset}-${Date.now()}.pdf`);
    } else {
      if (numPages === 1) {
        const pageCanvas = await generatePageCanvas(0);
        const formatType = exportFormat === "png" ? "image/png" : "image/jpeg";
        const fileExt = exportFormat === "png" ? "png" : "jpg";
        const link = document.createElement("a");
        link.download = `planar-export.${fileExt}`;
        link.href = pageCanvas.toDataURL(formatType);
        link.click();
      } else {
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();
        
        const formatType = exportFormat === "png" ? "image/png" : "image/jpeg";
        const fileExt = exportFormat === "png" ? "png" : "jpg";

        for (let i = 0; i < numPages; i++) {
          const pageCanvas = await generatePageCanvas(i);
          const dataUrl = pageCanvas.toDataURL(formatType);
          const base64Data = dataUrl.split(",")[1];
          zip.file(`page_${i + 1}.${fileExt}`, base64Data, { base64: true });
        }

        const zipBlob = await zip.generateAsync({ type: "blob" });
        const link = document.createElement("a");
        link.download = `planar-pages-${Date.now()}.zip`;
        link.href = URL.createObjectURL(zipBlob);
        link.click();
      }
    }

    // For multi-sheet posters, surface an assembly guide showing how the pages
    // tile together and which seams to glue.
    if (numPages > 1) {
      setShowGluePreview(true);
    }
  };

  const generatePageCanvas = async (pageIndex: number): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement("canvas");
    const renderScale = 6; 
    canvas.width = paperWidth * renderScale;
    canvas.height = paperHeight * renderScale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const { cols, rows, usableWidth, usableHeight } = getLayoutDimensions();
    const col = pageIndex % cols;
    const row = Math.floor(pageIndex / cols);

    const pageLeft = col * usableWidth;
    const pageTop = row * usableHeight;

    for (const img of images) {
      const { w: visibleW, h: visibleH } = getImageVisibleSize(img);
      const { w: layoutW, h: layoutH } = getImageLayoutSize(img);
      const imgLeft = img.x;
      const imgTop = img.y;

      const intersects = 
        imgLeft < pageLeft + usableWidth &&
        imgLeft + layoutW > pageLeft &&
        imgTop < pageTop + usableHeight &&
        imgTop + layoutH > pageTop;

      if (!intersects) continue;

      const htmlImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = img.src;
      });

      ctx.save();

      const relX = imgLeft - pageLeft;
      const relY = imgTop - pageTop;

      const canvasX = relX + sheetMargin;
      const canvasY = relY + sheetMargin;

      const centerX = (canvasX + visibleW / 2) * renderScale;
      const centerY = (canvasY + visibleH / 2) * renderScale;
      ctx.translate(centerX, centerY);
      ctx.rotate((img.rotation * Math.PI) / 180);

      ctx.beginPath();
      const hw = (visibleW / 2) * renderScale;
      const hh = (visibleH / 2) * renderScale;
      const r = img.crop.cornerRadius * renderScale;

      if (img.crop.shape === "rectangle") {
        ctx.roundRect(-hw, -hh, visibleW * renderScale, visibleH * renderScale, r);
      } else if (img.crop.shape === "star") {
        const cx = 0, cy = 0;
        const rOuter = Math.min(hw, hh);
        const rInner = rOuter * img.crop.starInnerRatio;
        const pts = img.crop.starPoints;
        let angle = -Math.PI / 2;
        const angleStep = Math.PI / pts;
        for (let idx = 0; idx < pts * 2; idx++) {
          const radiusVal = idx % 2 === 0 ? rOuter : rInner;
          const px = cx + radiusVal * Math.cos(angle);
          const py = cy + radiusVal * Math.sin(angle);
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
          angle += angleStep;
        }
      } else if (img.crop.shape === "polygon") {
        const cx = 0, cy = 0;
        const radiusVal = Math.min(hw, hh);
        const sides = img.crop.polygonSides;
        let angle = -Math.PI / 2;
        const angleStep = (2 * Math.PI) / sides;
        for (let idx = 0; idx < sides; idx++) {
          const px = cx + radiusVal * Math.cos(angle);
          const py = cy + radiusVal * Math.sin(angle);
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
          angle += angleStep;
        }
      }
      ctx.closePath();
      ctx.clip();

      const offsetX = img.targetWidth * (img.crop.left / 100);
      const offsetY = img.targetHeight * (img.crop.top / 100);

      ctx.drawImage(
        htmlImg,
        (-visibleW / 2 - offsetX) * renderScale,
        (-visibleH / 2 - offsetY) * renderScale,
        img.targetWidth * renderScale,
        img.targetHeight * renderScale
      );

      ctx.restore();
    }

    // --- Gluing seam guides ---------------------------------------------
    // Draw a gray dotted line along the margin boundary ONLY on sides that abut
    // another sheet (an internal seam where the user overlaps and glues). The
    // outermost edges of the whole poster get no line, because nothing is glued
    // there. The margin strip itself is the overlap/glue allowance.
    if (cols > 1 || rows > 1) {
      const m = sheetMargin * renderScale;
      const W = canvas.width;
      const H = canvas.height;

      ctx.save();
      ctx.strokeStyle = "rgba(120, 120, 120, 0.85)";
      ctx.lineWidth = Math.max(1, renderScale * 0.25);
      ctx.setLineDash([renderScale * 1.6, renderScale * 1.4]);

      ctx.beginPath();
      if (col > 0) {           // glue seam on the left
        ctx.moveTo(m, 0);
        ctx.lineTo(m, H);
      }
      if (col < cols - 1) {    // glue seam on the right
        ctx.moveTo(W - m, 0);
        ctx.lineTo(W - m, H);
      }
      if (row > 0) {           // glue seam on the top
        ctx.moveTo(0, m);
        ctx.lineTo(W, m);
      }
      if (row < rows - 1) {    // glue seam on the bottom
        ctx.moveTo(0, H - m);
        ctx.lineTo(W, H - m);
      }
      ctx.stroke();
      ctx.restore();
    }

    return canvas;
  };

  if (!mounted) return null;

  const renderSheets = () => {
    const { cols, rows, usableWidth, usableHeight } = getLayoutDimensions();
    const sheets = [];

    if (cols === 1 && rows === 1) {
      sheets.push(
        <div 
          key="sheet-0-0"
          className="paper-sheet"
          style={{
            width: `${paperWidth * PX_PER_MM}px`,
            height: `${paperHeight * PX_PER_MM}px`,
            left: 0,
            top: 0,
            border: "1px solid #dcdcdc",
            backgroundColor: "#ffffff",
          }}
        >
          <div 
            className="print-safe-margin"
            style={{
              position: "absolute",
              top: `${sheetMargin * PX_PER_MM}px`,
              left: `${sheetMargin * PX_PER_MM}px`,
              right: `${sheetMargin * PX_PER_MM}px`,
              bottom: `${sheetMargin * PX_PER_MM}px`,
              border: "1px dashed rgba(128, 128, 128, 0.4)",
            }}
          />
        </div>
      );
    } else {
      sheets.push(
        <div
          key="printable-grid-bg"
          style={{
            position: "absolute",
            width: `${cols * usableWidth * PX_PER_MM}px`,
            height: `${rows * usableHeight * PX_PER_MM}px`,
            left: `${sheetMargin * PX_PER_MM}px`,
            top: `${sheetMargin * PX_PER_MM}px`,
            backgroundColor: "#ffffff",
            boxShadow: "0 4px 16px rgba(0,0,0,0.05)",
            border: "1px solid #e2e2e2",
          }}
        />
      );

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          sheets.push(
            <div
              key={`sheet-${c}-${r}`}
              style={{
                position: "absolute",
                width: `${paperWidth * PX_PER_MM}px`,
                height: `${paperHeight * PX_PER_MM}px`,
                left: `${c * usableWidth * PX_PER_MM}px`,
                top: `${r * usableHeight * PX_PER_MM}px`,
                border: "1px dotted rgba(128, 128, 128, 0.5)",
                backgroundColor: "rgba(255, 255, 255, 0.02)",
                pointerEvents: "none",
                zIndex: 15,
              }}
            />
          );
        }
      }
    }
    return sheets;
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo-section">
          <img 
            src={theme === "light" ? "/favicon-black.png" : "/favicon-white.png"} 
            alt="Planar Logo" 
            className="logo-icon"
          />
          <span>Planar</span>
        </div>
        
        <div className="header-controls">
          <div className="segmented-control">
            {(["mm", "cm", "in"] as const).map((u) => (
              <button
                key={u}
                className={`segment-btn ${unit === u ? "active" : ""}`}
                onClick={() => setUnit(u)}
              >
                {u.toUpperCase()}
              </button>
            ))}
          </div>

          <button className="icon-btn" onClick={toggleTheme} title="Toggle light/dark mode">
            {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
      </header>

      <main className="main-content">
        <div className="workspace-viewport">
          {isCalibrationActive && selectedImage && (
            <div className="banner calibration-banner" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
              <Ruler size={16} className="upload-icon" style={{ margin: 0, color: "var(--accent-color)" }} />
              <div>
                <span className="banner-title">Calibrating physical dimensions</span>
                <p style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                  {calibrationPoints.length === 0 
                    ? "Click Point A on the image preview"
                    : calibrationPoints.length === 1 
                    ? "Click Point B on the image preview" 
                    : "Enter real-world measurement distance below"}
                </p>
              </div>
              
              {calibrationPoints.length >= 2 && (
                <div className="banner-controls">
                  <input
                    type="number"
                    step="any"
                    placeholder={`Distance in ${getUnitSymbol()}`}
                    className="input-field"
                    style={{ width: "120px", padding: "4px 8px" }}
                    value={calibrationDistance}
                    onChange={(e) => setCalibrationDistance(e.target.value)}
                  />
                  <button className="icon-btn" style={{ height: "30px", width: "30px" }} onClick={applyCalibration}>
                    <Check size={14} />
                  </button>
                </div>
              )}
              <button 
                className="btn btn-secondary" 
                style={{ padding: "4px 8px", fontSize: "11px", width: "auto" }}
                onClick={() => {
                  setIsCalibrationActive(false);
                  setCalibrationPoints([]);
                }}
              >
                Cancel
              </button>
            </div>
          )}

          {bgRemovalProgress !== null && (
            <div className="banner" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
              <RefreshCw size={14} className="animate-spin" style={{ animation: "spin 2s linear infinite" }} />
              <div>
                <span className="banner-title">Removing Background...</span>
                <p style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                  Downloading RemBG model: {bgRemovalProgress}%
                </p>
              </div>
            </div>
          )}

          {croppingImageId && selectedImage && (
            <div className="banner" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()} style={{ borderColor: "var(--accent-color)" }}>
              <Crop size={16} style={{ color: "var(--accent-color)" }} />
              <div>
                <span className="banner-title">Cropping Mode Active</span>
                <p style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                  Adjust crop sliders in the sidebar. Double-click image again or click "Apply" to save.
                </p>
              </div>
              <button 
                className="btn btn-primary" 
                style={{ padding: "6px 12px", width: "auto" }}
                onClick={stopCropping}
              >
                Apply Crop
              </button>
            </div>
          )}

          <div className="zoom-controls" onClick={(e) => e.stopPropagation()} onMouseDown={(e) => e.stopPropagation()}>
            <button className="zoom-btn" onClick={handleZoomIn} title="Zoom In"><Plus size={14} /></button>
            <button className="zoom-btn" onClick={handleZoomOut} title="Zoom Out"><Minus size={14} /></button>
            <button className="zoom-btn" style={{ fontSize: "11px", fontWeight: "500" }} onClick={handleZoomReset} title="Reset Zoom">FIT</button>
            <button
              className={`zoom-btn ${showPerson ? "active" : ""}`}
              onClick={() => setShowPerson((v) => !v)}
              title={showPerson ? "Hide human scale reference" : "Show human scale reference"}
              disabled={pagesCount <= 1}
              style={{ opacity: pagesCount <= 1 ? 0.35 : 1 }}
            >
              <User size={14} />
            </button>
          </div>

          <div 
            className="workspace-container" 
            ref={workspaceRef}
            onMouseDown={handleWorkspaceMouseDown}
            onClick={() => {
              setSelectedImageId(null);
              stopCropping();
            }}
            style={{
              cursor: isPanning
                ? "grabbing"
                : spacePressed
                ? "grab"
                : "default",
            }}
          >
            <div
            className="workspace-scroll-wrapper"
            style={{
              width: `${(totalWidth + personOffset + 80) * PX_PER_MM * zoom}px`,
              height: `${(totalHeight + 80) * PX_PER_MM * zoom}px`,
              position: "relative",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: `${(40 + personOffset) * PX_PER_MM * zoom}px`,
                top: `${40 * PX_PER_MM * zoom}px`,
                width: `${totalWidth * PX_PER_MM * zoom}px`,
                height: `${totalHeight * PX_PER_MM * zoom}px`,
                overflow: "hidden",
                pointerEvents: "none",
                zIndex: 10,
              }}
            >
            </div>

            <div 
              className="workspace-pasteboard"
              ref={pasteboardRef}
              onClick={(e) => e.stopPropagation()}
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "0 0",
                width: `${totalWidth * PX_PER_MM}px`,
                height: `${totalHeight * PX_PER_MM}px`,
                position: "absolute",
                left: `${(40 + personOffset) * PX_PER_MM * zoom}px`,
                top: `${40 * PX_PER_MM * zoom}px`,
              }}
            >
              {/* Human Scale Figure (180cm tall). Rendered in full — its feet
                  align with the bottom of the sheet grid and it is never
                  clipped, so the whole person is always visible. */}
              {personVisible && (
                <div
                  style={{
                    position: "absolute",
                    left: `${-(PERSON_W + 20) * PX_PER_MM}px`,
                    top: `${(totalHeight - PERSON_H) * PX_PER_MM}px`,
                    width: `${PERSON_W * PX_PER_MM}px`,
                    height: `${PERSON_H * PX_PER_MM}px`,
                    overflow: "visible",
                    pointerEvents: "none",
                    zIndex: 2,
                  }}
                >
                  <svg
                    viewBox="0 0 83.5 243.2"
                    style={{
                      width: `${PERSON_W * PX_PER_MM}px`,
                      height: `${PERSON_H * PX_PER_MM}px`,
                      fill: "currentColor",
                      color: "var(--text-muted)",
                      opacity: 0.25,
                    }}
                  >
                    <path d="M 22.574217,241.67349 C 22.224017,241.10685 22.223387,239.11924 22.572827,237.25659 C 23.034967,234.79314 22.608087,232.69372 21.006867,229.55505 C 18.887427,225.40062 18.832317,224.56245 19.524847,207.01596 C 20.239397,188.91152 20.229657,188.78403 18.043027,187.61378 L 15.841927,186.43579 L 16.048517,154.7725 C 16.162127,137.35769 16.205457,121.92805 16.144797,120.48441 C 16.075497,118.83546 14.369517,116.12188 11.556117,113.18556 C 9.0930169,110.61484 5.4394869,105.58204 3.4371669,102.00156 C 0.10170688,96.037191 -0.15588312,95.014611 0.36373685,89.800401 C 0.67567685,86.670247 1.1825869,80.509211 1.4902169,76.109211 C 2.0224969,68.496046 5.6058969,48.704473 6.6391069,47.671261 C 6.9071369,47.403233 9.0182469,46.464702 11.330467,45.585636 C 16.710457,43.540254 30.030647,34.782798 30.796227,32.78773 C 31.117927,31.949394 30.650567,29.203771 29.757647,26.686347 C 26.372107,17.141468 26.488367,14.689315 30.623477,8.4248053 C 34.801117,2.0958521 36.433417,1.3422121 44.111797,2.1972011 C 51.491627,3.0189471 53.880067,4.1457301 54.637287,7.1627611 C 55.495907,10.583749 54.449997,20.593711 53.092047,21.95166 C 52.510387,22.533313 52.036177,25.281711 52.038227,28.059211 C 52.042897,34.358752 54.919477,39.609211 58.366157,39.609211 C 61.690027,39.609211 65.887247,41.904241 70.450297,46.216781 C 74.246387,49.804474 74.387967,50.180384 75.081547,58.51341 C 76.064627,70.32466 79.106487,80.574379 82.259277,82.699188 C 83.460607,83.508822 83.416547,86.067563 82.080007,93.109211 C 81.453647,96.409211 80.745487,100.44993 80.506317,102.08858 C 80.267137,103.72723 79.163137,106.29651 78.052977,107.79808 C 76.942807,109.29966 76.034497,111.18464 76.034497,111.98693 C 76.034497,114.79527 74.768337,116.69549 71.913317,118.17188 L 69.034497,119.66057 L 69.034497,132.69334 C 69.034497,139.86136 69.461257,148.7373 69.982847,152.41766 C 70.504437,156.09801 71.139647,164.90508 71.394417,171.98891 C 71.839467,184.36361 71.769137,184.95175 69.600547,186.98891 C 66.671227,189.74072 65.563847,196.93707 65.919507,210.91039 C 66.107287,218.28802 65.808897,222.17611 64.978097,223.17717 C 64.309117,223.98324 63.761767,226.50137 63.761767,228.77302 C 63.761767,232.39393 64.271887,233.32702 67.898127,236.33919 C 74.685837,241.97743 73.860267,242.60921 59.704787,242.60921 L 47.375087,242.60921 L 48.381047,237.05929 C 49.149427,232.82009 49.053977,230.28126 47.976867,226.30929 C 47.048357,222.88524 46.561227,215.74734 46.550617,205.41004 C 46.540157,195.22853 46.143007,189.31909 45.420627,188.59617 C 44.676577,187.85157 43.182527,187.77198 40.920627,188.35647 L 37.534497,189.23146 L 36.746447,202.17033 C 36.256197,210.21982 36.344987,217.35703 36.981437,221.05765 C 37.802917,225.83421 37.723037,227.43561 36.575947,229.18629 C 35.790267,230.38539 35.009517,233.78359 34.840967,236.73784 L 34.534497,242.10921 L 28.872727,242.40648 C 25.730667,242.57145 22.927587,242.24524 22.574217,241.67349 z" />
                  </svg>
                </div>
              )}

              {renderSheets()}

              <div className="canvas-layer">
                {images.map((img) => {
                  const isSelected = img.id === selectedImageId;
                  const isCropping = img.id === croppingImageId;

                  const { w: visibleW, h: visibleH } = getImageVisibleSize(img);

                  const widthCss = visibleW;
                  const heightCss = visibleH;

                  const scaleW = 100 - img.crop.left - img.crop.right;
                  const scaleH = 100 - img.crop.top - img.crop.bottom;
                  const imageWidthPct = (100 / scaleW) * 100;
                  const imageHeightPct = (100 / scaleH) * 100;

                  const offsetXPct = -(img.crop.left / scaleW) * 100;
                  const optionsYPct = -(img.crop.top / scaleH) * 100;

                  const clipPathStyle = getImageClipPath(img.crop);

                  return (
                    <div
                      key={img.id}
                      id={`img-wrap-${img.id}`}
                      className={`image-wrapper ${isSelected ? "selected" : ""}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isCalibrationActive && !isCropping) setSelectedImageId(img.id);
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        if (!isCalibrationActive) startCropping(img.id);
                      }}
                      onMouseDown={(e) => handleImageMouseDown(e, img, "drag")}
                      onTouchStart={(e) => handleImageTouchStart(e, img, "drag")}
                      style={{
                        left: `${(img.x + sheetMargin) * PX_PER_MM}px`,
                        top: `${(img.y + sheetMargin) * PX_PER_MM}px`,
                        width: `${widthCss * PX_PER_MM}px`,
                        height: `${heightCss * PX_PER_MM}px`,
                        transform: `rotate(${img.rotation}deg)`,
                        overflow: isCropping ? "visible" : "hidden",
                        clipPath: isCropping ? "none" : clipPathStyle,
                      }}
                      title={isCropping ? "Cropping mode active" : "Double click to crop image"}
                    >
                      <div
                        style={{
                          position: "relative",
                          width: `${widthCss * PX_PER_MM}px`,
                          height: `${heightCss * PX_PER_MM}px`,
                          pointerEvents: isCalibrationActive && isSelected ? "auto" : "none",
                        }}
                        onClick={isCalibrationActive && isSelected ? handleCalibrationClick : undefined}
                      >
                        {isCropping && (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img 
                            src={img.src} 
                            alt="uncropped background" 
                            style={{
                              position: "absolute",
                              left: `${offsetXPct}%`,
                              top: `${optionsYPct}%`,
                              width: `${imageWidthPct}%`,
                              height: `${imageHeightPct}%`,
                              opacity: 0.35,
                              zIndex: -1,
                            }}
                          />
                        )}

                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img.src}
                          className="image-content"
                          alt={img.name}
                          style={{
                            width: `${imageWidthPct}%`,
                            height: `${imageHeightPct}%`,
                            marginLeft: `${offsetXPct}%`,
                            marginTop: `${optionsYPct}%`,
                            clipPath: isCropping ? clipPathStyle : "none",
                            opacity: isCalibrationActive && !isSelected ? 0.4 : 1,
                          }}
                        />

                        {isCropping && (
                          <div className="crop-guide-lines" />
                        )}

                        {isCalibrationActive && isSelected && calibrationPoints.map((pt, idx) => (
                          <div
                            key={`pt-${idx}`}
                            className="calibration-point"
                            style={{
                              left: `${pt.x * 100}%`,
                              top: `${pt.y * 100}%`,
                            }}
                          >
                            {idx === 0 ? "A" : "B"}
                          </div>
                        ))}
                      </div>

                      {isSelected && !isCalibrationActive && !isCropping && (
                        <>
                          <div 
                            className="resize-handle br"
                            onMouseDown={(e) => handleImageMouseDown(e, img, "resize")}
                            onTouchStart={(e) => handleImageTouchStart(e, img, "resize")}
                          />
                          <div 
                            className="rotate-handle"
                            onMouseDown={(e) => handleImageMouseDown(e, img, "rotate")}
                            onTouchStart={(e) => handleImageTouchStart(e, img, "rotate")}
                            title="Drag to rotate, Shift to snap 45°"
                          >
                            <RotateCw size={10} style={{ color: "var(--text-main)" }} />
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>

        <div className={`drag-overlay ${isDragOver ? "active" : ""}`}>
          <div className="drag-overlay-box">
            <Upload size={48} className="upload-icon" />
            <p>Drop images to import into Planar</p>
          </div>
        </div>
      </div>

        <aside className="sidebar">
          {selectedImage && croppingImageId === selectedImage.id ? (
            <div className="sidebar-panel">
              <div className="sidebar-header">
                <button className="sidebar-header-btn" onClick={stopCropping}>
                  <ArrowLeft size={16} />
                  <span>Apply & Exit Crop</span>
                </button>
              </div>

              <section className="sidebar-section">
                <h2 className="sidebar-section-title">Crop Preset Ratio</h2>
                <div className="input-group">
                  <select 
                    className="select-field" 
                    value={selectedImage.crop.ratioPreset}
                    onChange={(e) => handleCropPresetChange(e.target.value as ImageCrop["ratioPreset"])}
                  >
                    <option value="free">Free Ratio (Custom)</option>
                    <option value="1:1">1:1 Square</option>
                    <option value="4:3">4:3 Standard</option>
                    <option value="3:4">3:4 Portrait</option>
                    <option value="16:9">16:9 Widescreen</option>
                    <option value="9:16">9:16 Widescreen Portrait</option>
                  </select>
                </div>
              </section>

              <section className="sidebar-section">
                <h2 className="sidebar-section-title">Crop Shape</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div className="input-group">
                    <select 
                      className="select-field" 
                      value={selectedImage.crop.shape}
                      onChange={(e) => {
                        const shape = e.target.value as ImageCrop["shape"];
                        setImages((prev) =>
                          prev.map((img) =>
                            img.id === selectedImage.id ? { ...img, crop: { ...img.crop, shape } } : img
                          )
                        );
                      }}
                    >
                      <option value="rectangle">Rectangle / Oval</option>
                      <option value="star">Star Shape</option>
                      <option value="polygon">Regular Polygon</option>
                    </select>
                  </div>

                  {selectedImage.crop.shape === "rectangle" && (
                    <div className="input-group">
                      <label className="input-label">Fillet Corner Radius ({getUnitSymbol()})</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        className="input-field"
                        value={Number(convertMmToActiveUnit(selectedImage.crop.cornerRadius).toFixed(1))}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            setImages((prev) =>
                              prev.map((img) =>
                                img.id === selectedImage.id 
                                  ? { ...img, crop: { ...img.crop, cornerRadius: convertActiveUnitToMm(val) } } 
                                  : img
                              )
                            );
                          }
                        }}
                      />
                    </div>
                  )}

                  {selectedImage.crop.shape === "star" && (
                    <div className="settings-grid">
                      <div className="input-group">
                        <label className="input-label">Points</label>
                        <input
                          type="number"
                          min="3"
                          max="20"
                          className="input-field"
                          value={selectedImage.crop.starPoints}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val)) {
                              setImages((prev) =>
                                prev.map((img) =>
                                  img.id === selectedImage.id ? { ...img, crop: { ...img.crop, starPoints: val } } : img
                                )
                              );
                            }
                          }}
                        />
                      </div>
                      <div className="input-group">
                        <label className="input-label">Inner Ratio</label>
                        <input
                          type="number"
                          min="0.1"
                          max="0.9"
                          step="0.1"
                          className="input-field"
                          value={selectedImage.crop.starInnerRatio}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) {
                              setImages((prev) =>
                                prev.map((img) =>
                                  img.id === selectedImage.id ? { ...img, crop: { ...img.crop, starInnerRatio: val } } : img
                                )
                              );
                            }
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {selectedImage.crop.shape === "polygon" && (
                    <div className="input-group">
                      <label className="input-label">Vertices (Polygon Sides)</label>
                      <input
                        type="number"
                        min="3"
                        max="12"
                        className="input-field"
                        value={selectedImage.crop.polygonSides}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (!isNaN(val)) {
                            setImages((prev) =>
                              prev.map((img) =>
                                img.id === selectedImage.id ? { ...img, crop: { ...img.crop, polygonSides: val } } : img
                              )
                            );
                          }
                        }}
                      />
                    </div>
                  )}

                </div>
              </section>

              <section className="sidebar-section">
                <h2 className="sidebar-section-title">Crop Boundaries</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  <div className="range-slider-group">
                    <div className="range-slider-header">
                      <span>Crop Left</span>
                      <span>{selectedImage.crop.left}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="45" 
                      className="range-input"
                      value={selectedImage.crop.left} 
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setImages((prev) =>
                          prev.map((img) =>
                            img.id === selectedImage.id ? { ...img, crop: { ...img.crop, left: val, ratioPreset: "free" } } : img
                          )
                        );
                      }}
                    />
                  </div>

                  <div className="range-slider-group">
                    <div className="range-slider-header">
                      <span>Crop Right</span>
                      <span>{selectedImage.crop.right}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="45" 
                      className="range-input"
                      value={selectedImage.crop.right} 
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setImages((prev) =>
                          prev.map((img) =>
                            img.id === selectedImage.id ? { ...img, crop: { ...img.crop, right: val, ratioPreset: "free" } } : img
                          )
                        );
                      }}
                    />
                  </div>

                  <div className="range-slider-group">
                    <div className="range-slider-header">
                      <span>Crop Top</span>
                      <span>{selectedImage.crop.top}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="45" 
                      className="range-input"
                      value={selectedImage.crop.top} 
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setImages((prev) =>
                          prev.map((img) =>
                            img.id === selectedImage.id ? { ...img, crop: { ...img.crop, top: val, ratioPreset: "free" } } : img
                          )
                        );
                      }}
                    />
                  </div>

                  <div className="range-slider-group">
                    <div className="range-slider-header">
                      <span>Crop Bottom</span>
                      <span>{selectedImage.crop.bottom}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="45" 
                      className="range-input"
                      value={selectedImage.crop.bottom} 
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setImages((prev) =>
                          prev.map((img) =>
                            img.id === selectedImage.id ? { ...img, crop: { ...img.crop, bottom: val, ratioPreset: "free" } } : img
                          )
                        );
                      }}
                    />
                  </div>

                  <button className="btn btn-primary" onClick={stopCropping}>
                    Apply Crop & Save
                  </button>
                </div>
              </section>

            </div>
          ) : selectedImage ? (
            <div className="sidebar-panel">
              <div className="sidebar-header">
                <button 
                  className="sidebar-header-btn" 
                  onClick={() => setSelectedImageId(null)}
                >
                  <ArrowLeft size={16} />
                  <span>Back to Layout</span>
                </button>
              </div>

              <section className="sidebar-section">
                <h2 className="sidebar-section-title">Scale Image</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div className="settings-grid">
                    <div className="input-group">
                      <label className="input-label">Width ({getUnitSymbol()})</label>
                      <input
                        type="number"
                        step="any"
                        className="input-field"
                        value={Number(convertMmToActiveUnit(selectedImage.targetWidth).toFixed(2))}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            const ratio = selectedImage.targetHeight / selectedImage.targetWidth;
                            setImages((prev) =>
                              prev.map((img) =>
                                img.id === selectedImage.id
                                  ? {
                                      ...img,
                                      targetWidth: convertActiveUnitToMm(val),
                                      targetHeight: convertActiveUnitToMm(val) * ratio,
                                    }
                                  : img
                              )
                            );
                          }
                        }}
                      />
                    </div>
                    
                    <div className="input-group">
                      <label className="input-label">Height ({getUnitSymbol()})</label>
                      <input
                        type="number"
                        step="any"
                        className="input-field"
                        value={Number(convertMmToActiveUnit(selectedImage.targetHeight).toFixed(2))}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            const ratio = selectedImage.targetWidth / selectedImage.targetHeight;
                            setImages((prev) =>
                              prev.map((img) =>
                                img.id === selectedImage.id
                                  ? {
                                      ...img,
                                      targetHeight: convertActiveUnitToMm(val),
                                      targetWidth: convertActiveUnitToMm(val) * ratio,
                                    }
                                  : img
                              )
                            );
                          }
                        }}
                      />
                    </div>
                  </div>

                  <p style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "-6px" }}>
                    Aspect ratio is locked. Drag corner handles to scale. Double-click image to crop.
                  </p>
                </div>
              </section>

              <section className="sidebar-section">
                <h2 className="sidebar-section-title">Processing & Crop</h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => startCropping(selectedImage.id)}
                  >
                    <Crop size={14} />
                    Crop Image Bounds
                  </button>

                  {selectedImage.mimeType === "image/png" && selectedImage.bounds && (
                    <label className="checkbox-container">
                      <input
                        type="checkbox"
                        className="visually-hidden"
                        checked={selectedImage.useImageBounds}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setImages((prev) =>
                            prev.map((img) =>
                              img.id === selectedImage.id
                                ? { ...img, useImageBounds: checked }
                                : img
                            )
                          );
                        }}
                      />
                      <div className="checkbox-custom">
                        {selectedImage.useImageBounds && <Check size={10} strokeWidth={3} />}
                      </div>
                      <span>Use tight content bounds (crop margins)</span>
                    </label>
                  )}

                  <button 
                    className="btn btn-secondary" 
                    onClick={startCalibration}
                    disabled={isCalibrationActive}
                  >
                    <Ruler size={14} />
                    Calibrate Physical Size
                  </button>

                  {!selectedImage.backgroundRemoved && (
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => handleRemoveBackground(selectedImage)}
                      disabled={isBgRemovalProcessing}
                    >
                      <RefreshCw size={14} style={{ animation: isBgRemovalProcessing ? "spin 2s linear infinite" : "none" }} />
                      Remove Background (RemBG)
                    </button>
                  )}

                </div>
              </section>

              <section className="sidebar-section" style={{ borderBottom: "none" }}>
                <button 
                  className="btn btn-danger" 
                  onClick={() => {
                    setImages((prev) => prev.filter((i) => i.id !== selectedImage.id));
                    setSelectedImageId(null);
                  }}
                >
                  <Trash2 size={14} />
                  Delete Image
                </button>
              </section>
            </div>
          ) : (
            <div className="sidebar-panel">
              
              <div className="step-group">
                <span className="step-number">1</span>
                <h3 className="step-title">
                  <Layers size={16} />
                  <span>Choose Paper Size</span>
                </h3>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div className="input-group">
                    <label className="input-label">Select Preset</label>
                    <select className="select-field" value={paperPreset} onChange={handlePresetChange}>
                      {Object.keys(PAPER_PRESETS).map((key) => (
                        <option key={key} value={key}>
                          {PAPER_PRESETS[key].name}
                        </option>
                      ))}
                      <option value="custom">Custom Size...</option>
                    </select>
                  </div>

                  {paperPreset === "custom" && (
                    <div className="settings-grid">
                      <div className="input-group">
                        <label className="input-label">Width ({getUnitSymbol()})</label>
                        <input
                          type="number"
                          step="any"
                          className="input-field"
                          value={Number(convertMmToActiveUnit(paperWidth).toFixed(2))}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) setPaperWidth(convertActiveUnitToMm(val));
                          }}
                        />
                      </div>
                      <div className="input-group">
                        <label className="input-label">Height ({getUnitSymbol()})</label>
                        <input
                          type="number"
                          step="any"
                          className="input-field"
                          value={Number(convertMmToActiveUnit(paperHeight).toFixed(2))}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            if (!isNaN(val)) setPaperHeight(convertActiveUnitToMm(val));
                          }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="input-group" style={{ marginTop: "8px" }}>
                    <label className="input-label">Print Margin ({getUnitSymbol()})</label>
                    <input
                      type="number"
                      step="any"
                      className="input-field"
                      value={Number(convertMmToActiveUnit(sheetMargin).toFixed(2))}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) setSheetMargin(convertActiveUnitToMm(val));
                      }}
                    />
                  </div>

                  {pagesCount > 1 && (
                    <div className="badge-warning" style={{ marginTop: "12px" }}>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <AlertCircle size={14} style={{ color: "var(--accent-color)" }} />
                        <span className="badge-warning-title">Tiled Poster Grid</span>
                      </div>
                      <span className="badge-warning-desc">
                        Poster grid spans <strong>{pagesCount}</strong> ({cols} × {rows}) sheets. Physical bounds are shown as dotted lines.
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 2: Upload Images */}
              <div className="step-group">
                <span className="step-number">2</span>
                <h3 className="step-title">
                  <Upload size={16} />
                  <span>Upload Images</span>
                </h3>
                
                <input
                  type="file"
                  className="visually-hidden"
                  ref={fileInputRef}
                  multiple
                  accept="image/*,.heic,.heif,.avif,.tif,.tiff,.webp,.bmp"
                  onChange={(e) => {
                    if (e.target.files) loadImagesFromFiles(e.target.files);
                  }}
                />

                <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
                  <Upload size={18} className="upload-icon" />
                  <p style={{ fontWeight: 500, fontSize: "0.82rem" }}>Upload or drag images</p>
                  <p style={{ fontSize: "0.72rem", color: "var(--text-secondary)", marginTop: "2px" }}>JPG, PNG, WebP, HEIC, AVIF, TIFF & more · paste too</p>
                </div>

                {/* Built-in example images */}
                <div className="example-label">Or try an example</div>
                <div className="example-gallery">
                  {["Bird.jpg", "Dog.jpg", "Flower.jpg", "Forest.jpg", "Rocky Nature.jpg"].map((ex) => (
                    <div
                      key={ex}
                      className="example-thumb"
                      title={`Add ${ex.replace(/\.[^.]+$/, "")}`}
                      onClick={() => loadExampleImage(ex)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/examples/${encodeURIComponent(ex)}`} alt={ex} />
                    </div>
                  ))}
                </div>

                {images.length > 0 ? (
                  <div className="image-list" style={{ marginTop: "16px" }}>
                    {images.map((img) => (
                      <div 
                        key={img.id}
                        className="image-list-card"
                        onClick={() => setSelectedImageId(img.id)}
                        title="Click to scale or edit"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.src} alt={img.name} className="thumbnail-preview" />
                        <div className="image-card-info">
                          <div className="image-card-name">{img.name}</div>
                          <div className="image-card-meta">
                            {Number(convertMmToActiveUnit(getImageLayoutSize(img).w).toFixed(1))} × {Number(convertMmToActiveUnit(getImageLayoutSize(img).h).toFixed(1))} {getUnitSymbol()}
                          </div>
                          <span style={{ fontSize: "8px", textTransform: "uppercase", color: "var(--text-muted)", display: "block", marginTop: "2px" }}>Click to resize / edit</span>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setImages((prev) => prev.filter((i) => i.id !== img.id));
                          }}
                          title="Remove image"
                          style={{ padding: "4px", color: "var(--text-muted)", cursor: "pointer" }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="sidebar-placeholder">
                    <Grid size={24} style={{ opacity: 0.3 }} />
                    <p>No images uploaded yet.</p>
                  </div>
                )}
              </div>

              {/* Step 3: Arrange & Pack */}
              <div className="step-group">
                <span className="step-number">3</span>
                <h3 className="step-title">
                  <Grid size={16} />
                  <span>Arrange & Pack</span>
                </h3>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <p style={{ fontSize: "11px", color: "var(--text-secondary)", lineHeight: "1.4" }}>
                    Hold <strong>Space + drag</strong> or use trackpad to pan around the workspace. Pinch trackpad or hold <strong>Ctrl + scroll wheel</strong> to zoom. Double-click image to crop.
                  </p>

                    <label className="checkbox-container">
                      <input
                        type="checkbox"
                        className="visually-hidden"
                        checked={allowRotation}
                        onChange={(e) => setAllowRotation(e.target.checked)}
                      />
                      <div className="checkbox-custom">
                        {allowRotation && <Check size={10} strokeWidth={3} />}
                      </div>
                      <span>Allow 90° image rotation to conserve space</span>
                    </label>

                    <button 
                      className="btn btn-secondary" 
                      onClick={() => setImages((prev) => distributeImagesList(prev))}
                      disabled={images.length === 0}
                    >
                      <Grid size={14} />
                      Distribute (Auto arrange)
                    </button>
                </div>
              </div>

              {/* Step 4: Export PDF */}
              <div className="step-group" style={{ borderBottom: "none" }}>
                <span className="step-number">4</span>
                <h3 className="step-title">
                  <Download size={16} />
                  <span>Export Document</span>
                </h3>
                
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div className="input-group">
                    <label className="input-label">Export Format</label>
                    <select 
                      className="select-field" 
                      value={exportFormat}
                      onChange={(e) => setExportFormat(e.target.value as "pdf" | "png" | "jpg")}
                    >
                      <option value="pdf">PDF Document (.pdf)</option>
                      <option value="png">PNG Images (.png / .zip)</option>
                      <option value="jpg">JPEG Images (.jpg / .zip)</option>
                    </select>
                  </div>

                  <button
                    className="btn btn-primary"
                    onClick={triggerExport}
                    disabled={images.length === 0}
                  >
                    <Download size={14} />
                    Export printable {exportFormat.toUpperCase()}
                  </button>

                  <div className="size-summary">
                    <div className="size-summary-row">
                      <span className="size-summary-label">Full size (with margins)</span>
                      <span className="size-summary-value">
                        {Number(convertMmToActiveUnit(totalWidth).toFixed(1))} × {Number(convertMmToActiveUnit(totalHeight).toFixed(1))} {getUnitSymbol()}
                      </span>
                    </div>
                    <div className="size-summary-row">
                      <span className="size-summary-label">Printable area (margins removed)</span>
                      <span className="size-summary-value">
                        {Number(convertMmToActiveUnit(cols * usableWidth).toFixed(1))} × {Number(convertMmToActiveUnit(rows * usableHeight).toFixed(1))} {getUnitSymbol()}
                      </span>
                    </div>
                    {pagesCount > 1 && (
                      <div className="size-summary-row">
                        <span className="size-summary-label">Sheets</span>
                        <span className="size-summary-value">{pagesCount} ({cols} × {rows})</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Unsaved Warning footer */}
              <footer className="save-warning-footer">
                <AlertCircle size={14} style={{ color: "var(--text-muted)", flexShrink: 0, marginTop: "2px" }} />
                <div className="save-warning-text">
                  Planar runs entirely in your browser. Work is not saved to a server. Leaving or refreshing this page will discard your layout.
                </div>
              </footer>

            </div>
          )}

          {/* About footer */}
          <footer className="about-footer">
            <div className="about-author">Made with ❤️ by Mason Chen</div>
            <div className="about-links">
              <a href="https://github.com/Mason363" target="_blank" rel="noopener noreferrer" className="about-link">
                <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle" }}><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
                <span>GitHub</span>
              </a>
              <a href="https://buymeacoffee.com/masonchen" target="_blank" rel="noopener noreferrer" className="about-link">
                <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: "middle" }}><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>
                <span>Buy Me a Coffee</span>
              </a>
            </div>
          </footer>
        </aside>
      </main>

      {showGluePreview && pagesCount > 1 && (
        <div className="glue-modal-overlay" onClick={() => setShowGluePreview(false)}>
          <div className="glue-modal" onClick={(e) => e.stopPropagation()}>
            <div className="glue-modal-header">
              <div>
                <h2 className="glue-modal-title">Assembly Guide</h2>
                <p className="glue-modal-subtitle">
                  Print all {pagesCount} sheets, then lay them out in this {cols} × {rows} grid.
                  Overlap and glue along the <strong>gray dotted seams</strong>; the plain outer
                  edges are the finished border of your poster.
                </p>
              </div>
              <button className="icon-btn" onClick={() => setShowGluePreview(false)} title="Close">
                <Plus size={18} style={{ transform: "rotate(45deg)" }} />
              </button>
            </div>

            <div
              className="glue-grid"
              style={{
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gridTemplateRows: `repeat(${rows}, 1fr)`,
                aspectRatio: `${cols * paperWidth} / ${rows * paperHeight}`,
              }}
            >
              {Array.from({ length: rows }).map((_, r) =>
                Array.from({ length: cols }).map((_, c) => {
                  const num = r * cols + c + 1;
                  return (
                    <div
                      key={`glue-${c}-${r}`}
                      className="glue-cell"
                      style={{
                        borderLeft: c > 0 ? "2px dashed #888" : "2px solid var(--text-main)",
                        borderRight: c < cols - 1 ? "2px dashed #888" : "2px solid var(--text-main)",
                        borderTop: r > 0 ? "2px dashed #888" : "2px solid var(--text-main)",
                        borderBottom: r < rows - 1 ? "2px dashed #888" : "2px solid var(--text-main)",
                      }}
                    >
                      <span className="glue-cell-num">{num}</span>
                    </div>
                  );
                })
              )}
            </div>

            <div className="glue-legend">
              <span className="glue-legend-item">
                <span className="glue-swatch dashed" /> Glue seam (overlap here)
              </span>
              <span className="glue-legend-item">
                <span className="glue-swatch solid" /> Outer edge (do not glue)
              </span>
            </div>

            <button className="btn btn-primary" onClick={() => setShowGluePreview(false)}>
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
