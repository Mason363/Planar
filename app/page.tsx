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
  FileImage,
  RefreshCw,
  Scaling,
  Maximize2
} from "lucide-react";

// Types
interface ImageItem {
  id: string;
  name: string;
  originalSrc: string; // original uploaded image (data URL or blob URL)
  src: string;         // transparent bg-removed or original src
  width: number;       // natural width in pixels
  height: number;      // natural height in pixels
  
  // Configuration settings (in mm internally)
  targetWidth: number;  // target width in mm
  targetHeight: number; // target height in mm
  
  // Bounding box cropping (for PNG/bg removed images)
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

// Preset paper sizes (defined in mm)
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

export default function PlanarApp() {
  // Theme state
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [mounted, setMounted] = useState(false);

  // Unit and layout variables
  const [unit, setUnit] = useState<"mm" | "cm" | "in">("mm");
  const [paperPreset, setPaperPreset] = useState<string>("A4");
  const [paperWidth, setPaperWidth] = useState<number>(210); // in mm
  const [paperHeight, setPaperHeight] = useState<number>(297); // in mm
  const [sheetMargin, setSheetMargin] = useState<number>(5); // in mm
  const [gluingMargin, setGluingMargin] = useState<number>(10); // in mm
  const [layoutMode, setLayoutMode] = useState<"flow" | "tiled">("flow");
  const [allowRotation, setAllowRotation] = useState<boolean>(false);

  // Workspace and UI states
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(0.8);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [exportFormat, setExportFormat] = useState<"pdf" | "png" | "jpg">("pdf");
  
  // Background removal model download progress
  const [bgRemovalProgress, setBgRemovalProgress] = useState<number | null>(null);
  const [isBgRemovalProcessing, setIsBgRemovalProcessing] = useState<boolean>(false);

  // Calibration state
  const [isCalibrationActive, setIsCalibrationActive] = useState<boolean>(false);
  const [calibrationPoints, setCalibrationPoints] = useState<{ x: number; y: number }[]>([]); // fraction of current image size
  const [calibrationDistance, setCalibrationDistance] = useState<string>("");

  // DOM Refs
  const workspaceRef = useRef<HTMLDivElement>(null);
  const pasteboardRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Sync preset selection to dimensions
  const handlePresetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const presetKey = e.target.value;
    setPaperPreset(presetKey);
    if (presetKey !== "custom") {
      const preset = PAPER_PRESETS[presetKey];
      setPaperWidth(preset.width);
      setPaperHeight(preset.height);
    }
  };

  // Image dimension handlers (respecting selected image)
  const selectedImage = images.find((img) => img.id === selectedImageId);

  // File loading
  const loadImagesFromFiles = (files: FileList) => {
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const img = new Image();
        img.onload = () => {
          // Convert pixels to an initial physical size (defaulting to 72 DPI or fitting inside the page)
          // 72 DPI => 1px = 25.4 / 72 mm ~ 0.3528 mm
          const pxToMm = 0.3528;
          let initialW = img.naturalWidth * pxToMm;
          let initialH = img.naturalHeight * pxToMm;

          // If too large, scale down to fit inside the paper bounds comfortably
          const maxWidth = paperWidth - 2 * sheetMargin;
          const maxHeight = paperHeight - 2 * sheetMargin;
          if (initialW > maxWidth || initialH > maxHeight) {
            const ratio = Math.min(maxWidth / initialW, maxHeight / initialH);
            initialW *= ratio;
            initialH *= ratio;
          }

          const newImg: ImageItem = {
            id: Math.random().toString(36).substring(2, 9),
            name: file.name,
            originalSrc: dataUrl,
            src: dataUrl,
            width: img.naturalWidth,
            height: img.naturalHeight,
            targetWidth: initialW,
            targetHeight: initialH,
            useImageBounds: false,
            bounds: null,
            x: sheetMargin + Math.random() * 10, // slight offset to prevent exact overlap
            y: sheetMargin + Math.random() * 10,
            rotation: 0,
            mimeType: file.type,
            backgroundRemoved: false,
          };

          // Detect PNG bounds immediately if it is a PNG
          if (file.type === "image/png") {
            getImageBounds(img).then((bounds) => {
              newImg.bounds = bounds;
              // Add to state
              setImages((prev) => {
                const next = [...prev, newImg];
                // Auto distribute on import
                return distributeImagesList(next);
              });
            });
          } else {
            setImages((prev) => {
              const next = [...prev, newImg];
              return distributeImagesList(next);
            });
          }
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    });
  };

  // Bounding box of non-transparent pixels
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
            if (alpha > 10) { // Transparency threshold
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

  // Drag and drop events for workspace
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      loadImagesFromFiles(e.dataTransfer.files);
    }
  };

  // Client-side Background Removal (rembg)
  const handleRemoveBackground = async (image: ImageItem) => {
    setIsBgRemovalProcessing(true);
    setBgRemovalProgress(0);
    try {
      // Dynamically import the background removal library to prevent SSR issues
      const { removeBackground } = await import("@imgly/background-removal");
      
      const config = {
        progress: (key: string, current: number, total: number) => {
          const pct = Math.round((current / total) * 100);
          setBgRemovalProgress(isNaN(pct) ? 0 : pct);
        }
      };

      // Fetch blob
      const response = await fetch(image.originalSrc);
      const blob = await response.blob();

      // Process
      const transparentBlob = await removeBackground(blob, config);
      const transparentUrl = URL.createObjectURL(transparentBlob);

      // Create temporary image element to get bounds
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
                    // If background removed, it has transparency, so default enable "Use image bounds"
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
      alert("Failed to remove background. Ensure WebAssembly is supported in this browser.");
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

    // Convert input distance to mm
    const physicalDistMm = convertActiveUnitToMm(physicalDistInput);

    // Calculate pixel coordinates of points A and B
    const pt1 = calibrationPoints[0];
    const pt2 = calibrationPoints[1];

    let wPx = selectedImage.width;
    let hPx = selectedImage.height;

    // If using image bounds, the calibration clicks are on the cropped boundary box
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

    // physical scale: mm per pixel
    const scale = physicalDistMm / pixelDist;

    // Apply scale to natural image dimensions to calculate target physical width & height
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

    // Exit calibration
    setIsCalibrationActive(false);
    setCalibrationPoints([]);
    setCalibrationDistance("");
  };

  // Page layout boundaries
  const getLayoutDimensions = () => {
    // If empty images, return a single page size
    if (images.length === 0) {
      return { totalWidth: paperWidth, totalHeight: paperHeight, cols: 1, rows: 1, pagesCount: 1 };
    }

    if (layoutMode === "flow") {
      // Flow Mode: Pages stacked vertically
      // Find maximum pageIndex required
      const maxPageIndex = images.reduce((max, img) => {
        // If image is larger than sheet, it might overflow, but in Flow Mode we distribute on single sheets
        // We will compute the layout page index dynamically.
        return Math.max(max, getImgPageIndex(img));
      }, 0);
      const pagesCount = maxPageIndex + 1;
      return {
        totalWidth: paperWidth,
        totalHeight: pagesCount * paperHeight + (pagesCount - 1) * 10, // 10mm gap visual padding
        cols: 1,
        rows: pagesCount,
        pagesCount
      };
    } else {
      // Tiled Grid Mode: Sheets aligned adjacently with gluing overlap
      // The pitch width & height is paper size minus gluing margin
      const pitchW = paperWidth - gluingMargin;
      const pitchH = paperHeight - gluingMargin;

      // Find max coordinates of placed images
      let maxRight = paperWidth;
      let maxBottom = paperHeight;

      images.forEach((img) => {
        const rightEdge = img.x + img.targetWidth;
        const bottomEdge = img.y + img.targetHeight;
        if (rightEdge > maxRight) maxRight = rightEdge;
        if (bottomEdge > maxBottom) maxBottom = bottomEdge;
      });

      // Bounding box cols & rows
      // Guard against exact borders with -0.1mm buffer
      const cols = Math.max(1, Math.ceil((maxRight - 0.1) / pitchW));
      const rows = Math.max(1, Math.ceil((maxBottom - 0.1) / pitchH));
      const pagesCount = cols * rows;

      return {
        totalWidth: cols * pitchW + gluingMargin,
        totalHeight: rows * pitchH + gluingMargin,
        cols,
        rows,
        pagesCount
      };
    }
  };

  // Helper to find page index of an image in flow layout (where page pitch is paperHeight)
  const getImgPageIndex = (img: ImageItem): number => {
    // In Flow mode, images have coordinates (x, y) relative to their specific page.
    // Let's divide by paperHeight to see which page it belongs to if y is absolute,
    // but in our implementation, images are stored in a continuous canvas where page i occupies y from i * paperHeight to i * paperHeight + paperHeight.
    return Math.floor(img.y / paperHeight);
  };

  const { totalWidth, totalHeight, cols, rows, pagesCount } = getLayoutDimensions();

  // Distribute packing algorithm
  const distributeImagesList = (items: ImageItem[]): ImageItem[] => {
    if (items.length === 0) return items;

    // Clean margin and spacing
    const margin = sheetMargin;
    const spacing = 3; // 3mm gap between packed images
    const printableW = paperWidth - 2 * margin;
    const printableH = paperHeight - 2 * margin;

    // Filter large images that exceed a single page's printable size (even rotated)
    // These large images are centered or kept at (margin, margin) spanning across pages
    const normalImages = items.filter((img) => {
      const w = img.useImageBounds && img.bounds ? img.bounds.w * (img.targetWidth / img.width) : img.targetWidth;
      const h = img.useImageBounds && img.bounds ? img.bounds.h * (img.targetHeight / img.height) : img.targetHeight;
      return (w <= printableW && h <= printableH) || (allowRotation && h <= printableW && w <= printableH);
    });

    const largeImages = items.filter((img) => !normalImages.includes(img));

    // Sort normal images by area (largest first)
    const sortedNormal = [...normalImages].sort((a, b) => {
      const wA = a.useImageBounds && a.bounds ? a.bounds.w * (a.targetWidth / a.width) : a.targetWidth;
      const hA = a.useImageBounds && a.bounds ? a.bounds.h * (a.targetHeight / a.height) : a.targetHeight;
      const wB = b.useImageBounds && b.bounds ? b.bounds.w * (b.targetWidth / b.width) : b.targetWidth;
      const hB = b.useImageBounds && b.bounds ? b.bounds.h * (b.targetHeight / b.height) : b.targetHeight;
      return (wB * hB) - (wA * hA);
    });

    // We will place normal images sheet-by-sheet (pageIndex 0, 1, 2...)
    interface PlacedRect {
      x: number;
      y: number;
      w: number;
      h: number;
    }
    const pagePlacements: PlacedRect[][] = [[]]; // placed rects per page index

    const positionedNormal = sortedNormal.map((img) => {
      const imgW = img.useImageBounds && img.bounds ? img.bounds.w * (img.targetWidth / img.width) : img.targetWidth;
      const imgH = img.useImageBounds && img.bounds ? img.bounds.h * (img.targetHeight / img.height) : img.targetHeight;

      // Try to fit on existing pages
      for (let pageIdx = 0; pageIdx < pagePlacements.length; pageIdx++) {
        const placed = pagePlacements[pageIdx];
        const fitPos = findSpace(imgW, imgH, printableW, printableH, placed, margin, spacing, allowRotation);
        if (fitPos) {
          placed.push({ x: fitPos.x, y: fitPos.y, w: fitPos.w, h: fitPos.h });
          
          // Image absolute position on pasteboard:
          // X: fitPos.x (plus bounding box offset if using cropped bounds)
          // Y: pageIdx * paperHeight + fitPos.y (plus padding in Flow Mode, but absolute layout coordinate is continuous)
          let absX = fitPos.x;
          let absY = (layoutMode === "flow") 
            ? pageIdx * paperHeight + fitPos.y 
            : fitPos.y; // in Tiled mode, they all live in a single 2D grid, but we will pack in Page 0 (0,0) first.
          
          // Adjust offset if using cropped bounding box
          if (img.useImageBounds && img.bounds) {
            const ratioX = img.targetWidth / img.width;
            const ratioY = img.targetHeight / img.height;
            absX -= img.bounds.x * ratioX;
            absY -= img.bounds.y * ratioY;
          }

          return {
            ...img,
            x: absX,
            y: absY,
            rotation: fitPos.rotation,
          };
        }
      }

      // Fit on a new page
      const newPageIdx = pagePlacements.length;
      pagePlacements.push([]);
      const placed = pagePlacements[newPageIdx];
      const fitPos = findSpace(imgW, imgH, printableW, printableH, placed, margin, spacing, allowRotation);
      
      const finalPos = fitPos || { x: margin, y: margin, w: imgW, h: imgH, rotation: 0 };
      placed.push({ x: finalPos.x, y: finalPos.y, w: finalPos.w, h: finalPos.h });

      let absX = finalPos.x;
      let absY = (layoutMode === "flow") 
        ? newPageIdx * paperHeight + finalPos.y 
        : finalPos.y;

      if (img.useImageBounds && img.bounds) {
        const ratioX = img.targetWidth / img.width;
        const ratioY = img.targetHeight / img.height;
        absX -= img.bounds.x * ratioX;
        absY -= img.bounds.y * ratioY;
      }

      return {
        ...img,
        x: absX,
        y: absY,
        rotation: finalPos.rotation,
      };
    });

    // Place large images that span pages
    const positionedLarge = largeImages.map((img, idx) => {
      // Just center or place large images at margin offset
      let absX = margin;
      let absY = (layoutMode === "flow") 
        ? idx * paperHeight + margin 
        : margin;

      if (img.useImageBounds && img.bounds) {
        const ratioX = img.targetWidth / img.width;
        const ratioY = img.targetHeight / img.height;
        absX -= img.bounds.x * ratioX;
        absY -= img.bounds.y * ratioY;
      }

      return {
        ...img,
        x: absX,
        y: absY,
        rotation: 0,
      };
    });

    return [...positionedNormal, ...positionedLarge];
  };

  const handleDistributeClick = () => {
    setImages((prev) => distributeImagesList(prev));
  };

  // Shelf-packing helper function
  const findSpace = (
    w: number,
    h: number,
    printableW: number,
    printableH: number,
    placed: { x: number; y: number; w: number; h: number }[],
    margin: number,
    spacing: number,
    allowRot: boolean
  ) => {
    // Candidates are the bottom-left and top-right corners of already placed items, plus initial (margin, margin)
    const candidates = [{ x: margin, y: margin }];
    placed.forEach((rect) => {
      candidates.push({ x: rect.x + rect.w + spacing, y: rect.y });
      candidates.push({ x: rect.x, y: rect.y + rect.h + spacing });
    });

    // Sort: lowest Y, then lowest X
    candidates.sort((a, b) => {
      if (Math.abs(a.y - b.y) > 0.01) return a.y - b.y;
      return a.x - b.x;
    });

    for (const cand of candidates) {
      // Check standard rotation
      if (cand.x + w <= margin + printableW && cand.y + h <= margin + printableH) {
        let overlap = false;
        for (const rect of placed) {
          if (checkOverlap(cand.x, cand.y, w, h, rect.x, rect.y, rect.w, rect.h, spacing)) {
            overlap = true;
            break;
          }
        }
        if (!overlap) return { x: cand.x, y: cand.y, w, h, rotation: 0 };
      }

      // Check rotated rotation
      if (allowRot) {
        if (cand.x + h <= margin + printableW && cand.y + w <= margin + printableH) {
          let overlap = false;
          for (const rect of placed) {
            if (checkOverlap(cand.x, cand.y, h, w, rect.x, rect.y, rect.w, rect.h, spacing)) {
              overlap = true;
              break;
            }
          }
          if (!overlap) return { x: cand.x, y: cand.y, w: h, h: w, rotation: 90 };
        }
      }
    }
    return null;
  };

  const checkOverlap = (
    x1: number, y1: number, w1: number, h1: number,
    x2: number, y2: number, w2: number, h2: number,
    spacing: number
  ) => {
    return !(
      x1 + w1 + spacing <= x2 ||
      x2 + w2 + spacing <= x1 ||
      y1 + h1 + spacing <= y2 ||
      y2 + h2 + spacing <= y1
    );
  };

  // Mouse drag handlers on the canvas
  const handleImageMouseDown = (e: React.MouseEvent, img: ImageItem, actionType: "drag" | "resize" | "rotate") => {
    e.preventDefault();
    e.stopPropagation();
    if (isCalibrationActive) return;

    setSelectedImageId(img.id);

    // Initial scale values to convert CSS pixels back to mm
    // The visual scale depends on zoom. If zoom = 0.8, 1mm = 0.8px in CSS coordinates or zoom scaled coordinates.
    // Let's compute actual mouse coordinate relative to the zoom-scale pasteboard container
    const startX = e.clientX;
    const startY = e.clientY;

    dragInfo.current = {
      type: actionType,
      imageId: img.id,
      startX,
      startY,
      initialX: img.x,
      initialY: img.y,
      initialWidth: img.targetWidth,
      initialHeight: img.targetHeight,
      initialRotation: img.rotation,
    };

    document.addEventListener("mousemove", handleGlobalMouseMove);
    document.addEventListener("mouseup", handleGlobalMouseUp);
  };

  const handleGlobalMouseMove = (e: MouseEvent) => {
    const info = dragInfo.current;
    if (!info.type || !info.imageId) return;

    // Convert mouse movement delta in pixels to mm (knowing zoom ratio)
    // 1px on screen is (1 / zoom) CSS pixels on pasteboard.
    // Since pasteboard coordinates are rendered directly in mm, 1mm = 1px on the scale container!
    // So delta in mm is delta in pixels / zoom.
    const deltaX = (e.clientX - info.startX) / zoom;
    const deltaY = (e.clientY - info.startY) / zoom;

    setImages((prev) =>
      prev.map((img) => {
        if (img.id !== info.imageId) return img;

        if (info.type === "drag") {
          let newX = info.initialX + deltaX;
          let newY = info.initialY + deltaY;

          // Constraints: stay within pasteboard boundaries
          newX = Math.max(-50, Math.min(newX, totalWidth + 50));
          newY = Math.max(-50, Math.min(newY, totalHeight + 50));

          return { ...img, x: newX, y: newY };
        } 
        
        if (info.type === "resize") {
          // Bottom-right resizing handler
          // Proportional resize if Shift key is not pressed
          const ratio = info.initialHeight / info.initialWidth;
          let newW = info.initialWidth + deltaX;
          let newH = info.initialHeight + deltaY;

          // Keep minimum size (10mm)
          newW = Math.max(10, newW);
          newH = Math.max(10, newH);

          // Default: maintain aspect ratio
          if (!e.shiftKey) {
            if (Math.abs(deltaX) > Math.abs(deltaY)) {
              newH = newW * ratio;
            } else {
              newW = newH / ratio;
            }
          }

          return {
            ...img,
            targetWidth: newW,
            targetHeight: newH,
          };
        }

        if (info.type === "rotate") {
          // Rotate around the center of the image
          // Let's get the center of the image in pixels/mm on screen
          const imgEl = document.getElementById(`img-wrap-${img.id}`);
          if (!imgEl) return img;

          const rect = imgEl.getBoundingClientRect();
          const centerX = rect.left + rect.width / 2;
          const centerY = rect.top + rect.height / 2;

          const currentX = e.clientX;
          const currentY = e.clientY;

          // Angle between vertical line and current cursor
          const angleRad = Math.atan2(currentY - centerY, currentX - centerX);
          let angleDeg = (angleRad * 180) / Math.PI + 90; // Add 90 offset to align with rotate handle position

          // Snap to 45 degree steps if Shift key is held
          if (e.shiftKey) {
            angleDeg = Math.round(angleDeg / 45) * 45;
          } else {
            // Otherwise snap to nearest 90 degrees if close (within 5 degrees)
            const nearest90 = Math.round(angleDeg / 90) * 90;
            if (Math.abs(angleDeg - nearest90) < 5) {
              angleDeg = nearest90;
            }
          }

          // Normalize angle [0..360)
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

  // Zoom controls
  const handleZoomIn = () => setZoom((z) => Math.min(3.0, z + 0.1));
  const handleZoomOut = () => setZoom((z) => Math.max(0.2, z - 0.1));
  const handleZoomReset = () => setZoom(0.8);

  // Keyboard shortcut to delete active selected image
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedImageId && (e.key === "Delete" || e.key === "Backspace")) {
        // Only trigger if focus is not in an input field
        const tag = document.activeElement?.tagName.toLowerCase();
        if (tag !== "input" && tag !== "select" && tag !== "textarea") {
          e.preventDefault();
          setImages((prev) => prev.filter((img) => img.id !== selectedImageId));
          setSelectedImageId(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedImageId]);

  // Export functions
  const triggerExport = async () => {
    if (images.length === 0) return alert("Upload images to export.");

    const { totalWidth: wMm, totalHeight: hMm, pagesCount: numPages } = getLayoutDimensions();

    if (exportFormat === "pdf") {
      // Dynamic import jsPDF
      const { jsPDF } = await import("jspdf");
      
      // jsPDF format is [width, height] in mm
      const doc = new jsPDF({
        orientation: paperWidth > paperHeight ? "landscape" : "portrait",
        unit: "mm",
        format: [paperWidth, paperHeight],
      });

      for (let i = 0; i < numPages; i++) {
        if (i > 0) doc.addPage([paperWidth, paperHeight]);
        
        // Generate page canvas
        const pageCanvas = await generatePageCanvas(i);
        const dataUrl = pageCanvas.toDataURL("image/png");
        
        // Draw canvas onto PDF page
        doc.addImage(dataUrl, "PNG", 0, 0, paperWidth, paperHeight, undefined, "FAST");
      }

      doc.save(`planar-${paperPreset}-${Date.now()}.pdf`);
    } else {
      // Export PNG/JPG. If multi-page, package into ZIP
      if (numPages === 1) {
        const pageCanvas = await generatePageCanvas(0);
        const formatType = exportFormat === "png" ? "image/png" : "image/jpeg";
        const fileExt = exportFormat === "png" ? "png" : "jpg";
        const link = document.createElement("a");
        link.download = `planar-export.${fileExt}`;
        link.href = pageCanvas.toDataURL(formatType);
        link.click();
      } else {
        // Multi-page export => ZIP
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
  };

  // Core canvas drawing helper used for PDF/Image Export
  const generatePageCanvas = async (pageIndex: number): Promise<HTMLCanvasElement> => {
    const canvas = document.createElement("canvas");
    // Scale multiplier for high resolution (300 DPI: 11.81 pixels per mm)
    const renderScale = 6; 
    canvas.width = paperWidth * renderScale;
    canvas.height = paperHeight * renderScale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;

    // Fill background (printing is white paper)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Compute bounding coordinates of this page in workspace space
    let pageLeft = 0;
    let pageTop = 0;

    if (layoutMode === "flow") {
      pageLeft = 0;
      // In flow layout, pages are stacked vertically with visual gaps, 
      // but print space has no gaps. Page top starts at pageIndex * paperHeight
      pageTop = pageIndex * paperHeight;
    } else {
      // Tiled layout
      const pitchW = paperWidth - gluingMargin;
      const pitchH = paperHeight - gluingMargin;
      
      const maxImgRight = images.reduce((max, img) => Math.max(max, img.x + img.targetWidth), paperWidth);
      const colsCount = Math.max(1, Math.ceil((maxImgRight - 0.1) / pitchW));
      
      const col = pageIndex % colsCount;
      const row = Math.floor(pageIndex / colsCount);
      pageLeft = col * pitchW;
      pageTop = row * pitchH;
    }

    // Draw overlap gluing border dashed marks if in tiled mode
    if (layoutMode === "tiled" && gluingMargin > 0) {
      ctx.strokeStyle = "#999999";
      ctx.lineWidth = 0.5 * renderScale;
      ctx.setLineDash([2 * renderScale, 2 * renderScale]);

      const pitchW = paperWidth - gluingMargin;
      const pitchH = paperHeight - gluingMargin;
      const maxImgRight = images.reduce((max, img) => Math.max(max, img.x + img.targetWidth), paperWidth);
      const maxImgBottom = images.reduce((max, img) => Math.max(max, img.y + img.targetHeight), paperHeight);
      
      const colsCount = Math.max(1, Math.ceil((maxImgRight - 0.1) / pitchW));
      const rowsCount = Math.max(1, Math.ceil((maxImgBottom - 0.1) / pitchH));
      const col = pageIndex % colsCount;
      const row = Math.floor(pageIndex / colsCount);

      // Draw dashed guides at boundary edges where they'll overlap with adjacent papers
      if (col > 0) {
        ctx.beginPath();
        ctx.moveTo(gluingMargin * renderScale, 0);
        ctx.lineTo(gluingMargin * renderScale, paperHeight * renderScale);
        ctx.stroke();
      }
      if (col < colsCount - 1) {
        ctx.beginPath();
        ctx.moveTo((paperWidth - gluingMargin) * renderScale, 0);
        ctx.lineTo((paperWidth - gluingMargin) * renderScale, paperHeight * renderScale);
        ctx.stroke();
      }
      if (row > 0) {
        ctx.beginPath();
        ctx.moveTo(0, gluingMargin * renderScale);
        ctx.lineTo(paperWidth * renderScale, gluingMargin * renderScale);
        ctx.stroke();
      }
      if (row < rowsCount - 1) {
        ctx.beginPath();
        ctx.moveTo(0, (paperHeight - gluingMargin) * renderScale);
        ctx.lineTo(paperWidth * renderScale, (paperHeight - gluingMargin) * renderScale);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // Draw images
    for (const img of images) {
      const imgW = img.targetWidth;
      const imgH = img.targetHeight;
      const imgLeft = img.x;
      const imgTop = img.y;

      // Overlap check
      const intersects = 
        imgLeft < pageLeft + paperWidth &&
        imgLeft + imgW > pageLeft &&
        imgTop < pageTop + paperHeight &&
        imgTop + imgH > pageTop;

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

      // Center transform for rotation
      const centerX = (relX + imgW / 2) * renderScale;
      const centerY = (relY + imgH / 2) * renderScale;
      ctx.translate(centerX, centerY);
      ctx.rotate((img.rotation * Math.PI) / 180);

      if (img.useImageBounds && img.bounds) {
        const bx = img.bounds.x;
        const by = img.bounds.y;
        const bw = img.bounds.w;
        const bh = img.bounds.h;

        ctx.drawImage(
          htmlImg,
          bx, by, bw, bh,
          (-imgW / 2) * renderScale,
          (-imgH / 2) * renderScale,
          imgW * renderScale,
          imgH * renderScale
        );
      } else {
        ctx.drawImage(
          htmlImg,
          (-imgW / 2) * renderScale,
          (-imgH / 2) * renderScale,
          imgW * renderScale,
          imgH * renderScale
        );
      }

      ctx.restore();
    }

    return canvas;
  };

  if (!mounted) return null;

  // Visual grids sheets mapping helper
  const renderSheets = () => {
    const sheets = [];
    if (layoutMode === "flow") {
      // Flow Mode: separate pages, stacked vertically with visual padding
      for (let i = 0; i < pagesCount; i++) {
        sheets.push(
          <div 
            key={`sheet-${i}`}
            className="paper-sheet"
            style={{
              width: `${paperWidth}px`,
              height: `${paperHeight}px`,
              left: 0,
              top: `${i * (paperHeight + 10)}px`, // 10px visual offset
            }}
          >
            {/* Draw print safe margin */}
            <div 
              className="print-safe-margin"
              style={{
                top: `${sheetMargin}px`,
                left: `${sheetMargin}px`,
                right: `${sheetMargin}px`,
                bottom: `${sheetMargin}px`,
              }}
            />
          </div>
        );
      }
    } else {
      // Tiled Grid Mode: sheets fit together directly
      const pitchW = paperWidth - gluingMargin;
      const pitchH = paperHeight - gluingMargin;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          sheets.push(
            <div
              key={`sheet-${c}-${r}`}
              className="paper-sheet"
              style={{
                width: `${paperWidth}px`,
                height: `${paperHeight}px`,
                left: `${c * pitchW}px`,
                top: `${r * pitchH}px`,
              }}
            >
              {/* Print-safe margins */}
              <div 
                className="print-safe-margin"
                style={{
                  top: `${sheetMargin}px`,
                  left: `${sheetMargin}px`,
                  right: `${sheetMargin}px`,
                  bottom: `${sheetMargin}px`,
                }}
              />
              
              {/* Overlap guides (gluing overlap region) */}
              {c > 0 && (
                <div 
                  className="gluing-margin-overlay" 
                  style={{ top: 0, left: 0, width: `${gluingMargin}px`, height: "100%" }}
                >
                  <div className="overlap-text" style={{ bottom: 2, left: 2 }}><Scissors size={8}/> gluing edge</div>
                </div>
              )}
              {r > 0 && (
                <div 
                  className="gluing-margin-overlay" 
                  style={{ top: 0, left: 0, width: "100%", height: `${gluingMargin}px` }}
                >
                  <div className="overlap-text" style={{ top: 2, right: 2 }}><Scissors size={8}/> gluing edge</div>
                </div>
              )}
            </div>
          );
        }
      }
    }
    return sheets;
  };

  return (
    <div className="app-container">
      {/* Top Header */}
      <header className="app-header">
        <div className="logo-section">
          <div className="logo-dot"></div>
          <span>Planar</span>
        </div>
        
        <div className="header-controls">
          {/* Unit Switcher */}
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

          {/* Theme Toggle */}
          <button className="icon-btn" onClick={toggleTheme} title="Toggle light/dark mode">
            {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </div>
      </header>

      {/* Main Workspace Workspace + Sidebar */}
      <main className="main-content" onDragOver={handleDragOver} onDrop={handleDrop}>
        {/* Center Canvas */}
        <div 
          className="workspace-container" 
          ref={workspaceRef}
          onDragLeave={handleDragLeave}
        >
          {/* Calibration active indicator banner */}
          {isCalibrationActive && selectedImage && (
            <div className="banner calibration-banner">
              <Ruler size={16} className="upload-icon" style={{ margin: 0, color: "var(--accent-color)" }} />
              <div>
                <span className="banner-title">Calibrating image</span>
                <p style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                  {calibrationPoints.length === 0 
                    ? "Click Point A on the image"
                    : calibrationPoints.length === 1 
                    ? "Click Point B on the image" 
                    : "Specify physical distance below"}
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

          {/* Background removal loading overlay */}
          {bgRemovalProgress !== null && (
            <div className="banner">
              <RefreshCw size={14} className="animate-spin" style={{ animation: "spin 2s linear infinite" }} />
              <div>
                <span className="banner-title">Removing Background...</span>
                <p style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                  Downloading AI model: {bgRemovalProgress}%
                </p>
              </div>
            </div>
          )}

          {/* Zoom Controls */}
          <div className="zoom-controls">
            <button className="zoom-btn" onClick={handleZoomIn} title="Zoom In"><Plus size={14} /></button>
            <button className="zoom-btn" onClick={handleZoomOut} title="Zoom Out"><Minus size={14} /></button>
            <button className="zoom-btn" style={{ fontSize: "9px" }} onClick={handleZoomReset} title="Reset Zoom">FIT</button>
          </div>

          {/* Pasteboard Wrapper */}
          <div 
            className="workspace-pasteboard"
            ref={pasteboardRef}
            style={{
              transform: `scale(${zoom})`,
              width: `${totalWidth}px`,
              height: `${totalHeight}px`,
            }}
          >
            {/* Sheets Preview Layer */}
            {renderSheets()}

            {/* Images Workspace Layer */}
            <div className="canvas-layer">
              {images.map((img) => {
                const isSelected = img.id === selectedImageId;
                
                // Physical dimensions in mm mapped 1-to-1 to CSS pixels in scale pasteboard
                const widthCss = img.targetWidth;
                const heightCss = img.targetHeight;

                // Adjust bounding box render offset if crop bounds is active
                let renderWidth = widthCss;
                let renderHeight = heightCss;
                let imgLeftOffset = 0;
                let imgTopOffset = 0;

                if (img.useImageBounds && img.bounds) {
                  // Scale factor between target bounding box and original pixels
                  const scaleW = widthCss / img.bounds.w;
                  const scaleH = heightCss / img.bounds.h;
                  
                  // Compute actual image display sizes
                  renderWidth = img.width * scaleW;
                  renderHeight = img.height * scaleH;

                  // Translate negative offset
                  imgLeftOffset = -img.bounds.x * scaleW;
                  imgTopOffset = -img.bounds.y * scaleH;
                }

                return (
                  <div
                    key={img.id}
                    id={`img-wrap-${img.id}`}
                    className={`image-wrapper ${isSelected ? "selected" : ""}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isCalibrationActive) setSelectedImageId(img.id);
                    }}
                    onMouseDown={(e) => handleImageMouseDown(e, img, "drag")}
                    style={{
                      left: `${img.x}px`,
                      top: `${img.y}px`,
                      width: `${widthCss}px`,
                      height: `${heightCss}px`,
                      transform: `rotate(${img.rotation}deg)`,
                      overflow: img.useImageBounds ? "hidden" : "visible",
                    }}
                  >
                    {/* Image visual wrapper */}
                    <div
                      style={{
                        position: "relative",
                        width: img.useImageBounds ? `${widthCss}px` : "100%",
                        height: img.useImageBounds ? `${heightCss}px` : "100%",
                        overflow: img.useImageBounds ? "hidden" : "visible",
                        pointerEvents: isCalibrationActive && isSelected ? "auto" : "none",
                      }}
                      onClick={isCalibrationActive && isSelected ? handleCalibrationClick : undefined}
                    >
                      {/* Original or transparent cropped image */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={img.src}
                        className="image-content"
                        alt={img.name}
                        style={{
                          width: img.useImageBounds ? `${renderWidth}px` : "100%",
                          height: img.useImageBounds ? `${renderHeight}px` : "100%",
                          marginLeft: img.useImageBounds ? `${imgLeftOffset}px` : "0",
                          marginTop: img.useImageBounds ? `${imgTopOffset}px` : "0",
                          opacity: isCalibrationActive && !isSelected ? 0.4 : 1,
                        }}
                      />

                      {/* Calibration points indicator crosshairs overlay */}
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

                    {/* Resizing and rotation control handles (visible only when selected & not calibrating) */}
                    {isSelected && !isCalibrationActive && (
                      <>
                        <div 
                          className="resize-handle br"
                          onMouseDown={(e) => handleImageMouseDown(e, img, "resize")}
                        />
                        <div 
                          className="rotate-handle"
                          onMouseDown={(e) => handleImageMouseDown(e, img, "rotate")}
                          title="Drag to rotate, Shift to snap 45°"
                        >
                          <RotateCw size={10} />
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Drag and drop full overlay feedback */}
          <div className={`drag-overlay ${isDragOver ? "active" : ""}`}>
            <div className="drag-overlay-box">
              <Upload size={48} className="upload-icon" />
              <p>Drop images to import into Planar</p>
            </div>
          </div>
        </div>

        {/* Sidebar Controls (Right) */}
        <aside className="sidebar" onClick={() => setSelectedImageId(null)}>
          {/* Paper Settings */}
          <section className="sidebar-section" onClick={(e) => e.stopPropagation()}>
            <h2 className="sidebar-section-title">Paper Size</h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
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

              {/* Custom Size Form fields */}
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

              {/* Layout Mode selection */}
              <div className="settings-grid" style={{ marginTop: "4px" }}>
                <div className="input-group">
                  <label className="input-label">Layout Mode</label>
                  <select 
                    className="select-field" 
                    value={layoutMode} 
                    onChange={(e) => setLayoutMode(e.target.value as "flow" | "tiled")}
                  >
                    <option value="flow">Flow (Separate Sheets)</option>
                    <option value="tiled">Gluing Grid (Tiled)</option>
                  </select>
                </div>
                
                {layoutMode === "tiled" ? (
                  <div className="input-group">
                    <label className="input-label">Gluing Overlap ({getUnitSymbol()})</label>
                    <input
                      type="number"
                      step="any"
                      className="input-field"
                      value={Number(convertMmToActiveUnit(gluingMargin).toFixed(2))}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!isNaN(val)) setGluingMargin(convertActiveUnitToMm(val));
                      }}
                    />
                  </div>
                ) : (
                  <div className="input-group">
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
                )}
              </div>

              {/* Gluing sheet count warning */}
              {layoutMode === "tiled" && pagesCount > 1 && (
                <div className="badge-warning">
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <AlertCircle size={14} style={{ color: "var(--accent-color)" }} />
                    <span className="badge-warning-title">Tiled Grid Layout</span>
                  </div>
                  <span className="badge-warning-desc">
                    Requires <strong>{pagesCount}</strong> ({cols} × {rows}) sheets of paper. Gluing and cutting boundaries are marked on the sheets.
                  </span>
                </div>
              )}
            </div>
          </section>

          {/* Files List upload */}
          <section className="sidebar-section" onClick={(e) => e.stopPropagation()}>
            <h2 className="sidebar-section-title">Images</h2>
            
            <input 
              type="file" 
              className="visually-hidden" 
              ref={fileInputRef} 
              multiple 
              accept="image/*"
              onChange={(e) => {
                if (e.target.files) loadImagesFromFiles(e.target.files);
              }}
            />
            
            <div className="upload-zone" onClick={() => fileInputRef.current?.click()}>
              <Upload size={20} className="upload-icon" />
              <p style={{ fontWeight: 500, fontSize: "0.85rem" }}>Upload or drag images</p>
              <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>PNG, JPG supported</p>
            </div>

            {/* List stack */}
            {images.length > 0 && (
              <div className="image-list" style={{ marginTop: "16px" }}>
                {images.map((img) => (
                  <div 
                    key={img.id}
                    className={`image-list-card ${img.id === selectedImageId ? "selected" : ""}`}
                    onClick={() => setSelectedImageId(img.id)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.src} alt={img.name} className="thumbnail-preview" />
                    <div className="image-card-info">
                      <div className="image-card-name">{img.name}</div>
                      <div className="image-card-meta">
                        {Number(convertMmToActiveUnit(img.targetWidth).toFixed(1))} × {Number(convertMmToActiveUnit(img.targetHeight).toFixed(1))} {getUnitSymbol()}
                      </div>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setImages((prev) => prev.filter((i) => i.id !== img.id));
                        if (selectedImageId === img.id) setSelectedImageId(null);
                      }}
                      title="Remove image"
                      style={{ padding: "4px", color: "var(--text-muted)", cursor: "pointer" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Active Image Settings (visible only when selected) */}
          {selectedImage && (
            <section className="sidebar-section" onClick={(e) => e.stopPropagation()}>
              <h2 className="sidebar-section-title">Image Options</h2>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                
                {/* Manual scale target input values */}
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

                {/* PNG bounds detection checkbox */}
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
                    <span>Use tight content bounds (crop transparent borders)</span>
                  </label>
                )}

                {/* Background removal triggers */}
                {!selectedImage.backgroundRemoved && (
                  <button 
                    className="btn btn-secondary" 
                    onClick={() => handleRemoveBackground(selectedImage)}
                    disabled={isBgRemovalProcessing}
                    style={{ fontSize: "0.85rem" }}
                  >
                    <RefreshCw size={14} style={{ animation: isBgRemovalProcessing ? "spin 2s linear infinite" : "none" }} />
                    Remove Background (rembg AI)
                  </button>
                )}

                {/* Ruler Calibration Button */}
                <button 
                  className="btn btn-secondary" 
                  onClick={startCalibration}
                  disabled={isCalibrationActive}
                  style={{ fontSize: "0.85rem" }}
                >
                  <Ruler size={14} />
                  Calibrate Physical Size
                </button>

              </div>
            </section>
          )}

          {/* Arrangement & Distribute Buttons */}
          <section className="sidebar-section" onClick={(e) => e.stopPropagation()}>
            <h2 className="sidebar-section-title">Layout Actions</h2>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
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
                onClick={handleDistributeClick}
                disabled={images.length === 0}
              >
                <Grid size={14} />
                Distribute (Auto arrange)
              </button>
            </div>
          </section>

          {/* Export Settings & Download */}
          <section className="sidebar-section" style={{ marginTop: "auto", borderBottom: "none" }} onClick={(e) => e.stopPropagation()}>
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
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}
