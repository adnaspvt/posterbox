import { useState, useRef, useEffect, useCallback } from 'react';
import {
  magicWandSelection,
  brushSelection,
  rectangleSelection,
  circleSelection,
  lassoSelection,
  autoDetectAreas,
  combineSelections,
  invertSelection,
  featherSelection
} from '../utils/selectionAlgorithms';
import toast from 'react-hot-toast';

export default function SelectionTools({
  canvasRef,
  initialSelection = null,
  onSelectionChange,
  onClose,
  isEmbedded = false,
  externalOverlayCanvasRef = null
}) {
  const [activeTool, setActiveTool] = useState('magic-wand');
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentSelection, setCurrentSelection] = useState(initialSelection);
  const [selectionMode, setSelectionMode] = useState('replace');
  const [brushSize, setBrushSize] = useState(10);
  const [tolerance, setTolerance] = useState(30);
  const [featherRadius, setFeatherRadius] = useState(0);
  const [useTestImage, setUseTestImage] = useState(false);
  const [hasCanvas, setHasCanvas] = useState(false);

  const drawPointsRef = useRef([]);
  const startPointRef = useRef(null);
  const isDrawingRef = useRef(false);
  const testCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);

  // Sync state with ref for event listeners
  isDrawingRef.current = isDrawing;

  // Track canvas availability
  useEffect(() => {
    if (canvasRef?.current) {
      setHasCanvas(true);
    }
  }, [canvasRef]);

  // Sync initial selection from parent
  useEffect(() => {
    setCurrentSelection(initialSelection);
  }, [initialSelection]);

  // Sync external overlay canvas dimensions with background canvas
  const syncCanvasDimensions = useCallback(() => {
    const targetOverlayCanvas = externalOverlayCanvasRef?.current || overlayCanvasRef.current;
    const sourceCanvas = (useTestImage ? testCanvasRef : canvasRef)?.current;
    if (targetOverlayCanvas && sourceCanvas && sourceCanvas.width && sourceCanvas.height) {
      if (targetOverlayCanvas.width !== sourceCanvas.width) {
        // eslint-disable-next-line react-hooks/immutability
        targetOverlayCanvas.width = sourceCanvas.width;
      }
      if (targetOverlayCanvas.height !== sourceCanvas.height) {
        // eslint-disable-next-line react-hooks/immutability
        targetOverlayCanvas.height = sourceCanvas.height;
      }
    }
  }, [canvasRef, externalOverlayCanvasRef, useTestImage]);

  useEffect(() => {
    syncCanvasDimensions();
  }, [syncCanvasDimensions, activeTool]);

  // Create test canvas if demo requested
  useEffect(() => {
    if (!useTestImage || !testCanvasRef.current) return;
    const canvas = testCanvasRef.current;
    const ctx = canvas.getContext('2d');
    canvas.width = 400;
    canvas.height = 300;

    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#FF6B6B');
    grad.addColorStop(0.5, '#4ECDC4');
    grad.addColorStop(1, '#45B7D1');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.beginPath();
    ctx.arc(100, 80, 40, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.rect(250, 150, 100, 80);
    ctx.fill();
  }, [useTestImage]);

  const getImageDataFromCanvas = useCallback(() => {
    let canvas = null;
    if (useTestImage && testCanvasRef.current) {
      canvas = testCanvasRef.current;
    } else if (canvasRef?.current) {
      canvas = canvasRef.current;
      if (canvas.tagName !== 'CANVAS') return null;
    }

    if (!canvas) return null;
    try {
      const ctx = canvas.getContext('2d');
      return ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (e) {
      console.error('Could not get image data from canvas:', e);
      return null;
    }
  }, [canvasRef, useTestImage]);

  const getCanvasCoords = useCallback((e) => {
    const canvas = externalOverlayCanvasRef?.current || (useTestImage ? testCanvasRef : canvasRef)?.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return null;

    let clientX = e.clientX;
    let clientY = e.clientY;

    if (clientX === undefined && e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if (clientX === undefined && e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
      clientY = e.changedTouches[0].clientY;
    }

    if (clientX === undefined || clientY === undefined || clientX === null || clientY === null) {
      return null;
    }

    const targetW = canvas.width || rect.width;
    const targetH = canvas.height || rect.height;

    const scaleX = targetW / rect.width;
    const scaleY = targetH / rect.height;

    return {
      x: Math.max(0, Math.min(targetW, (clientX - rect.left) * scaleX)),
      y: Math.max(0, Math.min(targetH, (clientY - rect.top) * scaleY))
    };
  }, [canvasRef, externalOverlayCanvasRef, useTestImage]);

  const drawMarchingAnts = (ctx, selection) => {
    if (!selection) return;
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);

    if (selection.type === 'rectangle' && selection.bounds) {
      const { x, y, width: w, height: h } = selection.bounds;
      ctx.strokeRect(x, y, w, h);
    } else if (selection.type === 'circle' && selection.centerX !== undefined) {
      ctx.beginPath();
      ctx.ellipse(selection.centerX, selection.centerY, selection.radiusX, selection.radiusY, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (selection.type === 'lasso' && selection.points && selection.points.length > 1) {
      ctx.beginPath();
      ctx.moveTo(selection.points[0][0], selection.points[0][1]);
      for (let i = 1; i < selection.points.length; i++) {
        ctx.lineTo(selection.points[i][0], selection.points[i][1]);
      }
      ctx.closePath();
      ctx.stroke();
    } else if (selection.bounds) {
      const { x, y, width: w, height: h } = selection.bounds;
      ctx.strokeRect(x, y, w, h);
    }
    ctx.restore();
  };

  const renderSelectionOverlay = useCallback((selection) => {
    const targetOverlayCanvas = externalOverlayCanvasRef?.current || overlayCanvasRef.current;
    if (!targetOverlayCanvas) return;
    syncCanvasDimensions();

    const ctx = targetOverlayCanvas.getContext('2d');
    const width = targetOverlayCanvas.width;
    const height = targetOverlayCanvas.height;

    ctx.clearRect(0, 0, width, height);
    if (!selection) return;

    // Draw translucent highlight mask
    if (selection.type === 'rectangle' && selection.bounds) {
      const { x, y, width: w, height: h } = selection.bounds;
      ctx.fillStyle = 'rgba(79, 70, 229, 0.3)';
      ctx.fillRect(x, y, w, h);
    } else if (selection.type === 'circle' && selection.centerX !== undefined) {
      ctx.fillStyle = 'rgba(79, 70, 229, 0.3)';
      ctx.beginPath();
      ctx.ellipse(selection.centerX, selection.centerY, selection.radiusX, selection.radiusY, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (selection.type === 'lasso' && selection.points && selection.points.length > 2) {
      ctx.fillStyle = 'rgba(79, 70, 229, 0.3)';
      ctx.beginPath();
      ctx.moveTo(selection.points[0][0], selection.points[0][1]);
      for (let i = 1; i < selection.points.length; i++) {
        ctx.lineTo(selection.points[i][0], selection.points[i][1]);
      }
      ctx.closePath();
      ctx.fill();
    } else if (selection.pixels && selection.pixels.length > 0) {
      const imgData = ctx.createImageData(width, height);
      const data = imgData.data;
      const pixels = selection.pixels;
      for (let i = 0; i < pixels.length; i++) {
        const [px, py] = pixels[i];
        if (px >= 0 && px < width && py >= 0 && py < height) {
          const idx = (py * width + px) * 4;
          data[idx] = 79;
          data[idx + 1] = 70;
          data[idx + 2] = 229;
          data[idx + 3] = 95;
        }
      }
      ctx.putImageData(imgData, 0, 0);
    }

    // Draw boundary line
    drawMarchingAnts(ctx, selection);
  }, [externalOverlayCanvasRef, syncCanvasDimensions]);

  // Re-render overlay whenever currentSelection changes
  useEffect(() => {
    renderSelectionOverlay(currentSelection);
  }, [currentSelection, renderSelectionOverlay]);

  const applySelectionMode = useCallback((newSelection) => {
    let final = newSelection;

    if (currentSelection && selectionMode !== 'replace') {
      if (selectionMode === 'add') {
        final = combineSelections(currentSelection, newSelection, 'add');
      } else if (selectionMode === 'subtract') {
        final = combineSelections(currentSelection, newSelection, 'subtract');
      } else if (selectionMode === 'intersect') {
        final = combineSelections(currentSelection, newSelection, 'intersect');
      }
    }

    if (featherRadius > 0 && final) {
      final = featherSelection(final, featherRadius);
    }

    setCurrentSelection(final);
    onSelectionChange?.(final);
  }, [currentSelection, selectionMode, featherRadius, onSelectionChange]);

  // Magic Wand click handler
  const handleMagicWandClick = useCallback((e) => {
    const coords = getCanvasCoords(e);
    if (!coords) return;

    const imageData = getImageDataFromCanvas();
    if (!imageData) {
      toast.error('No canvas image found. Please upload a background.');
      return;
    }

    const selection = magicWandSelection(imageData, Math.round(coords.x), Math.round(coords.y), tolerance);
    if (!selection || !selection.pixels || selection.pixels.length === 0) {
      toast.error('Could not determine area. Try increasing tolerance.');
      return;
    }

    applySelectionMode(selection);
    toast.success(`Magic Wand: ${selection.pixels.length.toLocaleString()} pixels selected`);
  }, [getCanvasCoords, getImageDataFromCanvas, tolerance, applySelectionMode]);

  // Event handlers for mouse/touch
  useEffect(() => {
    const canvas = externalOverlayCanvasRef?.current || (useTestImage ? testCanvasRef : canvasRef)?.current;
    if (!canvas) return;

    const onStart = (e) => {
      syncCanvasDimensions();
      const coords = getCanvasCoords(e);
      if (!coords) return;

      if (activeTool === 'magic-wand') {
        handleMagicWandClick(e);
        return;
      }

      setIsDrawing(true);
      isDrawingRef.current = true;
      startPointRef.current = coords;

      if (activeTool === 'brush') {
        drawPointsRef.current = [[coords.x, coords.y]];
        // Draw initial brush stamp
        const targetCanvas = externalOverlayCanvasRef?.current || overlayCanvasRef.current;
        if (targetCanvas) {
          const ctx = targetCanvas.getContext('2d');
          ctx.fillStyle = 'rgba(79, 70, 229, 0.4)';
          ctx.beginPath();
          ctx.arc(coords.x, coords.y, brushSize, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (activeTool === 'lasso') {
        drawPointsRef.current = [[coords.x, coords.y]];
      }
    };

    const onMove = (e) => {
      if (!isDrawingRef.current) return;
      const coords = getCanvasCoords(e);
      if (!coords) return;

      const targetCanvas = externalOverlayCanvasRef?.current || overlayCanvasRef.current;
      if (!targetCanvas) return;
      const ctx = targetCanvas.getContext('2d');

      if (activeTool === 'brush') {
        drawPointsRef.current.push([coords.x, coords.y]);
        ctx.fillStyle = 'rgba(79, 70, 229, 0.4)';
        ctx.beginPath();
        ctx.arc(coords.x, coords.y, brushSize, 0, Math.PI * 2);
        ctx.fill();
      } else if (activeTool === 'rectangle') {
        if (!startPointRef.current) return;
        ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
        // Redraw prior selection if adding or subtracting
        if (currentSelection && selectionMode !== 'replace') {
          renderSelectionOverlay(currentSelection);
        }

        const rx = Math.min(startPointRef.current.x, coords.x);
        const ry = Math.min(startPointRef.current.y, coords.y);
        const rw = Math.abs(coords.x - startPointRef.current.x);
        const rh = Math.abs(coords.y - startPointRef.current.y);

        ctx.fillStyle = 'rgba(79, 70, 229, 0.25)';
        ctx.fillRect(rx, ry, rw, rh);
        ctx.strokeStyle = '#4f46e5';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.strokeRect(rx, ry, rw, rh);
      } else if (activeTool === 'circle') {
        if (!startPointRef.current) return;
        ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
        if (currentSelection && selectionMode !== 'replace') {
          renderSelectionOverlay(currentSelection);
        }

        const cx = startPointRef.current.x;
        const cy = startPointRef.current.y;
        const radX = Math.abs(coords.x - cx);
        const radY = Math.abs(coords.y - cy);

        ctx.fillStyle = 'rgba(79, 70, 229, 0.25)';
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.max(1, radX), Math.max(1, radY), 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#4f46e5';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.stroke();
      } else if (activeTool === 'lasso') {
        drawPointsRef.current.push([coords.x, coords.y]);
        ctx.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
        if (currentSelection && selectionMode !== 'replace') {
          renderSelectionOverlay(currentSelection);
        }

        const pts = drawPointsRef.current;
        if (pts.length > 1) {
          ctx.strokeStyle = '#4f46e5';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 6]);
          ctx.beginPath();
          ctx.moveTo(pts[0][0], pts[0][1]);
          for (let i = 1; i < pts.length; i++) {
            ctx.lineTo(pts[i][0], pts[i][1]);
          }
          ctx.stroke();
        }
      }
    };

    const onEnd = (e) => {
      if (!isDrawingRef.current) return;
      setIsDrawing(false);
      isDrawingRef.current = false;

      const coords = getCanvasCoords(e) || startPointRef.current;
      if (!coords && !drawPointsRef.current.length) return;

      let selection = null;

      if (activeTool === 'brush') {
        if (drawPointsRef.current.length > 0) {
          selection = brushSelection(drawPointsRef.current, brushSize);
          toast.success(`Brush: ${selection.pixels.length.toLocaleString()} pixels selected`);
        }
      } else if (activeTool === 'rectangle' && startPointRef.current) {
        const endX = coords ? coords.x : startPointRef.current.x;
        const endY = coords ? coords.y : startPointRef.current.y;
        if (Math.abs(endX - startPointRef.current.x) > 3 || Math.abs(endY - startPointRef.current.y) > 3) {
          selection = rectangleSelection(startPointRef.current.x, startPointRef.current.y, endX, endY);
          toast.success(`Rectangle: ${selection.pixels.length.toLocaleString()} pixels selected`);
        }
      } else if (activeTool === 'circle' && startPointRef.current) {
        const endX = coords ? coords.x : startPointRef.current.x;
        const endY = coords ? coords.y : startPointRef.current.y;
        const radX = Math.abs(endX - startPointRef.current.x);
        const radY = Math.abs(endY - startPointRef.current.y);
        if (radX > 3 || radY > 3) {
          selection = circleSelection(startPointRef.current.x, startPointRef.current.y, radX, radY);
          toast.success(`Circle: ${selection.pixels.length.toLocaleString()} pixels selected`);
        }
      } else if (activeTool === 'lasso') {
        if (drawPointsRef.current.length >= 3) {
          selection = lassoSelection(drawPointsRef.current);
          toast.success(`Lasso: ${selection.pixels.length.toLocaleString()} pixels selected`);
        }
      }

      if (selection) {
        applySelectionMode(selection);
      } else {
        renderSelectionOverlay(currentSelection);
      }

      startPointRef.current = null;
      drawPointsRef.current = [];
    };

    // Mouse handlers
    const handleMouseDown = (e) => {
      e.preventDefault();
      onStart(e);
    };
    const handleMouseMove = (e) => {
      if (isDrawingRef.current) e.preventDefault();
      onMove(e);
    };
    const handleMouseUp = (e) => {
      onEnd(e);
    };

    // Touch handlers
    const handleTouchStart = (e) => {
      e.preventDefault();
      onStart(e);
    };
    const handleTouchMove = (e) => {
      e.preventDefault();
      onMove(e);
    };
    const handleTouchEnd = (e) => {
      e.preventDefault();
      onEnd(e);
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);

      canvas.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [
    activeTool,
    brushSize,
    currentSelection,
    selectionMode,
    tolerance,
    featherRadius,
    externalOverlayCanvasRef,
    useTestImage,
    canvasRef,
    syncCanvasDimensions,
    getCanvasCoords,
    getImageDataFromCanvas,
    applySelectionMode,
    renderSelectionOverlay,
    handleMagicWandClick
  ]);

  const handleAutoDetect = () => {
    const imageData = getImageDataFromCanvas();
    if (!imageData) {
      toast.error('No canvas image available');
      return;
    }

    const toastId = toast.loading('Detecting areas...');
    try {
      const areas = autoDetectAreas(imageData);
      toast.dismiss(toastId);

      if (!areas || areas.length === 0) {
        toast.error('No distinct areas detected');
        return;
      }

      let selection = areas[0];
      for (let i = 1; i < areas.length; i++) {
        selection = combineSelections(selection, areas[i], 'add');
      }

      setCurrentSelection(selection);
      onSelectionChange?.(selection);
      toast.success(`Auto-detected ${areas.length} areas`);
    } catch (err) {
      toast.dismiss(toastId);
      console.error(err);
      toast.error('Auto detect failed');
    }
  };

  const handleInvert = () => {
    if (!currentSelection) return;
    const imageData = getImageDataFromCanvas();
    if (!imageData) return;
    const inverted = invertSelection(currentSelection, imageData.width, imageData.height);
    setCurrentSelection(inverted);
    onSelectionChange?.(inverted);
    toast.success('Selection inverted');
  };

  const handleClearSelection = () => {
    setCurrentSelection(null);
    onSelectionChange?.(null);
    const targetOverlayCanvas = externalOverlayCanvasRef?.current || overlayCanvasRef.current;
    if (targetOverlayCanvas) {
      const ctx = targetOverlayCanvas.getContext('2d');
      ctx.clearRect(0, 0, targetOverlayCanvas.width, targetOverlayCanvas.height);
    }
    toast.success('Selection cleared');
  };

  return (
    <div className={isEmbedded ? "space-y-4" : "bg-white rounded-lg shadow-lg p-6 space-y-6 max-w-2xl"}>
      {!isEmbedded && (
        <div className="flex justify-between items-center border-b pb-4">
          <h2 className="text-xl font-bold text-slate-800">Selection Tools 🎯</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* NO CANVAS WARNING */}
      {!hasCanvas && !isEmbedded && (
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-3">
          <p className="text-sm font-bold text-amber-900">⚠️ Canvas not available</p>
          <p className="text-xs text-amber-700 mt-1">Using test image for demonstration</p>
          <button
            onClick={() => setUseTestImage(!useTestImage)}
            className="mt-2 text-xs bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold px-3 py-1 rounded transition"
          >
            {useTestImage ? 'Hide' : 'Show'} Test Image
          </button>
        </div>
      )}

      {/* TOOL SELECTION */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Tools</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[
            { id: 'magic-wand', label: '✨ Magic Wand' },
            { id: 'lasso', label: '🔗 Lasso' },
            { id: 'rectangle', label: '⬜ Rectangle' },
            { id: 'circle', label: '⭕ Circle' },
            { id: 'brush', label: '🖌️ Brush' },
          ].map(tool => (
            <button
              key={tool.id}
              onClick={() => {
                setActiveTool(tool.id);
                syncCanvasDimensions();
              }}
              className={`py-2.5 px-2 rounded-lg font-bold text-xs transition-all ${
                activeTool === tool.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {tool.label}
            </button>
          ))}
        </div>
        <button
          onClick={handleAutoDetect}
          className="w-full py-2.5 bg-purple-100 text-purple-700 font-bold text-xs rounded-lg hover:bg-purple-200 transition-all"
        >
          🤖 Auto Detect Areas
        </button>
      </div>

      {/* SELECTION MODE */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Mode</label>
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { id: 'replace', label: 'Replace' },
            { id: 'add', label: '+ Add' },
            { id: 'subtract', label: '- Sub' },
            { id: 'intersect', label: '∩ Both' }
          ].map(mode => (
            <button
              key={mode.id}
              onClick={() => setSelectionMode(mode.id)}
              className={`py-1.5 px-2 rounded-md text-[11px] font-bold transition-all ${
                selectionMode === mode.id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* TOOL PARAMETERS */}
      {activeTool === 'magic-wand' && (
        <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
          <div className="flex justify-between items-center text-xs font-bold text-slate-600">
            <span>Color Tolerance</span>
            <span className="text-indigo-600">{tolerance}</span>
          </div>
          <input
            type="range"
            min="1"
            max="120"
            value={tolerance}
            onChange={(e) => setTolerance(Number(e.target.value))}
            className="w-full accent-indigo-600"
          />
          <p className="text-[10px] text-slate-400">Click on any background region to flood-select matching pixels.</p>
        </div>
      )}

      {activeTool === 'brush' && (
        <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
          <div className="flex justify-between items-center text-xs font-bold text-slate-600">
            <span>Brush Size</span>
            <span className="text-indigo-600">{brushSize}px</span>
          </div>
          <input
            type="range"
            min="2"
            max="60"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-full accent-indigo-600"
          />
        </div>
      )}

      {/* FEATHER SELECTION */}
      <div className="space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
        <div className="flex justify-between items-center text-xs font-bold text-slate-600">
          <span>Feather Edges</span>
          <span className="text-indigo-600">{featherRadius}px</span>
        </div>
        <input
          type="range"
          min="0"
          max="30"
          value={featherRadius}
          onChange={(e) => setFeatherRadius(Number(e.target.value))}
          className="w-full accent-indigo-600"
        />
      </div>

      {/* SELECTION OPERATIONS */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Actions</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleInvert}
            disabled={!currentSelection}
            className="py-2 px-3 bg-slate-100 text-slate-700 font-bold rounded-lg text-xs hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            ↔️ Invert
          </button>
          <button
            onClick={handleClearSelection}
            disabled={!currentSelection}
            className="py-2 px-3 bg-red-100 text-red-700 font-bold rounded-lg text-xs hover:bg-red-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            🗑️ Clear
          </button>
        </div>
      </div>

      {/* SELECTION INFO */}
      {currentSelection && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 space-y-1">
          <div className="flex justify-between items-center">
            <p className="text-xs font-bold text-indigo-900">
              ✓ {currentSelection.pixels ? currentSelection.pixels.length.toLocaleString() : 'Active'} pixels selected
            </p>
            <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-indigo-200/70 text-indigo-800 rounded">
              {currentSelection.type}
            </span>
          </div>
          {currentSelection.bounds && (
            <p className="text-[11px] text-indigo-600">
              Bounds: {Math.round(currentSelection.bounds.width)} × {Math.round(currentSelection.bounds.height)} px
            </p>
          )}
        </div>
      )}

      {/* STANDALONE OVERLAY CANVAS IF NOT EMBEDDED */}
      {!externalOverlayCanvasRef && (
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase">Selection Preview</label>
          <canvas
            ref={overlayCanvasRef}
            className="w-full bg-slate-100 border-2 border-dashed border-slate-300 rounded-lg"
            style={{ display: 'block', minHeight: '200px' }}
          />
        </div>
      )}
    </div>
  );
}
