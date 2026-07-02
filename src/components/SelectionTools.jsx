import { useState, useRef, useEffect } from 'react';
import {
  magicWandSelection,
  brushSelection,
  rectangleSelection,
  circleSelection,
  lassoSelection,
  autoDetectAreas,
  generateSelectionMask,
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
  const [brushSize, setBrushSize] = useState(5);
  const [tolerance, setTolerance] = useState(30);
  const [featherRadius, setFeatherRadius] = useState(0);
  const [useTestImage, setUseTestImage] = useState(false);
  const [hasCanvas, setHasCanvas] = useState(false);
  const drawPointsRef = useRef([]);
  const startPointRef = useRef(null);
  const testCanvasRef = useRef(null);
  const overlayCanvasRef = useRef(null);

  // Try to get canvas from ref
  useEffect(() => {
    if (canvasRef?.current) {
      setHasCanvas(true);
    }
  }, [canvasRef]);

  // Sync initial selection from parent state when modal opens
  useEffect(() => {
    setCurrentSelection(initialSelection);
  }, [initialSelection]);

  // Create test canvas if no real canvas available
  useEffect(() => {
    if (!useTestImage || testCanvasRef.current) return;
    
    const canvas = testCanvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Draw a gradient test image
    canvas.width = 400;
    canvas.height = 300;
    
    // Create gradient background
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#FF6B6B');
    grad.addColorStop(0.5, '#4ECDC4');
    grad.addColorStop(1, '#45B7D1');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw some shapes
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(100, 80, 40, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.beginPath();
    ctx.rect(250, 150, 100, 80);
    ctx.fill();
  }, [useTestImage]);

  const getImageDataFromCanvas = () => {
    let canvas = null;
    
    if (useTestImage && testCanvasRef.current) {
      canvas = testCanvasRef.current;
    } else if (canvasRef?.current) {
      canvas = canvasRef.current;
      if (canvas.tagName !== 'CANVAS') {
        // If it's a div, try to draw its content
        return null;
      }
    }
    
    if (!canvas) return null;
    
    try {
      const ctx = canvas.getContext('2d');
      return ctx.getImageData(0, 0, canvas.width, canvas.height);
    } catch (e) {
      console.error('Could not get image data:', e);
      return null;
    }
  };

  // Display selection on overlay canvas
  useEffect(() => {
    const targetOverlayCanvas = externalOverlayCanvasRef?.current || overlayCanvasRef.current;
    if (!currentSelection || !targetOverlayCanvas) return;

    const canvas = targetOverlayCanvas;
    const imageData = getImageDataFromCanvas();

    if (!imageData) return;

    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw selection mask
    const mask = generateSelectionMask(currentSelection, imageData.width, imageData.height);
    const displayImageData = ctx.createImageData(imageData.width, imageData.height);

    for (let i = 0; i < mask.length; i++) {
      if (mask[i] > 0) {
        displayImageData.data[i * 4] = 100;
        displayImageData.data[i * 4 + 1] = 180;
        displayImageData.data[i * 4 + 2] = 255;
        displayImageData.data[i * 4 + 3] = 100;
      }
    }

    ctx.putImageData(displayImageData, 0, 0);

    // Draw marching ants border
    drawMarchingAnts(ctx, currentSelection, canvas.width, canvas.height);
  }, [currentSelection]);

  const drawMarchingAnts = (ctx, selection, width, height) => {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);

    if (selection.type === 'rectangle' && selection.bounds) {
      const { x, y, width: w, height: h } = selection.bounds;
      ctx.strokeRect(x, y, w, h);
    } else if (selection.type === 'circle' && selection.centerX !== undefined) {
      ctx.beginPath();
      ctx.ellipse(selection.centerX, selection.centerY, selection.radiusX, selection.radiusY, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (selection.type === 'lasso' && selection.points) {
      ctx.beginPath();
      ctx.moveTo(selection.points[0][0], selection.points[0][1]);
      selection.points.forEach(p => ctx.lineTo(p[0], p[1]));
      ctx.closePath();
      ctx.stroke();
    }
  };

  const handleMagicWand = (e) => {
    const imageData = getImageDataFromCanvas();
    if (!imageData) {
      toast.error('No canvas available. Use test image or check canvas ref.');
      return;
    }

    const canvas = externalOverlayCanvasRef?.current || (useTestImage ? testCanvasRef : canvasRef).current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (imageData.width / rect.width);
    const y = (e.clientY - rect.top) * (imageData.height / rect.height);

    const selection = magicWandSelection(imageData, x, y, tolerance);
    applySelectionMode(selection);
    toast.success(`Magic Wand: ${selection.pixels.length} pixels selected`);
  };

  const handleBrushStart = (e) => {
    if (activeTool !== 'brush') return;
    setIsDrawing(true);
    drawPointsRef.current = [];
    handleBrushMove(e);
  };

  const handleBrushMove = (e) => {
    if (!isDrawing || activeTool !== 'brush') return;

    const canvas = externalOverlayCanvasRef?.current || (useTestImage ? testCanvasRef : canvasRef).current;
    if (!canvas) return;
    
    const imageData = getImageDataFromCanvas();
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (imageData.width / rect.width);
    const y = (e.clientY - rect.top) * (imageData.height / rect.height);

    drawPointsRef.current.push([x, y]);
  };

  const handleBrushEnd = () => {
    if (activeTool !== 'brush' || drawPointsRef.current.length === 0) return;
    setIsDrawing(false);

    const selection = brushSelection(drawPointsRef.current, brushSize);
    applySelectionMode(selection);
    toast.success(`Brush: ${selection.pixels.length} pixels selected`);
  };

  const handleRectangleStart = (e) => {
    if (activeTool !== 'rectangle') return;
    setIsDrawing(true);
    const canvas = externalOverlayCanvasRef?.current || (useTestImage ? testCanvasRef : canvasRef).current;
    const imageData = getImageDataFromCanvas();
    const rect = canvas.getBoundingClientRect();
    startPointRef.current = {
      x: (e.clientX - rect.left) * (imageData.width / rect.width),
      y: (e.clientY - rect.top) * (imageData.height / rect.height)
    };
  };

  const handleRectangleEnd = (e) => {
    if (activeTool !== 'rectangle' || !startPointRef.current) return;
    setIsDrawing(false);

    const canvas = externalOverlayCanvasRef?.current || (useTestImage ? testCanvasRef : canvasRef).current;
    const imageData = getImageDataFromCanvas();
    const rect = canvas.getBoundingClientRect();
    const endX = (e.clientX - rect.left) * (imageData.width / rect.width);
    const endY = (e.clientY - rect.top) * (imageData.height / rect.height);

    const selection = rectangleSelection(startPointRef.current.x, startPointRef.current.y, endX, endY);
    applySelectionMode(selection);
    toast.success(`Rectangle: ${selection.pixels.length} pixels selected`);
  };

  const handleCircleStart = (e) => {
    if (activeTool !== 'circle') return;
    setIsDrawing(true);
    const canvas = externalOverlayCanvasRef?.current || (useTestImage ? testCanvasRef : canvasRef).current;
    const imageData = getImageDataFromCanvas();
    const rect = canvas.getBoundingClientRect();
    startPointRef.current = {
      x: (e.clientX - rect.left) * (imageData.width / rect.width),
      y: (e.clientY - rect.top) * (imageData.height / rect.height)
    };
  };

  const handleCircleEnd = (e) => {
    if (activeTool !== 'circle' || !startPointRef.current) return;
    setIsDrawing(false);

    const canvas = externalOverlayCanvasRef?.current || (useTestImage ? testCanvasRef : canvasRef).current;
    const imageData = getImageDataFromCanvas();
    const rect = canvas.getBoundingClientRect();
    const endX = (e.clientX - rect.left) * (imageData.width / rect.width);
    const endY = (e.clientY - rect.top) * (imageData.height / rect.height);

    const radiusX = Math.abs(endX - startPointRef.current.x);
    const radiusY = Math.abs(endY - startPointRef.current.y);

    const selection = circleSelection(startPointRef.current.x, startPointRef.current.y, radiusX, radiusY);
    applySelectionMode(selection);
    toast.success(`Circle: ${selection.pixels.length} pixels selected`);
  };

  const handleLassoStart = (e) => {
    if (activeTool !== 'lasso') return;
    setIsDrawing(true);
    drawPointsRef.current = [];
    handleLassoMove(e);
  };

  const handleLassoMove = (e) => {
    if (!isDrawing || activeTool !== 'lasso') return;

    const canvas = externalOverlayCanvasRef?.current || (useTestImage ? testCanvasRef : canvasRef).current;
    if (!canvas) return;
    
    const imageData = getImageDataFromCanvas();
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (imageData.width / rect.width);
    const y = (e.clientY - rect.top) * (imageData.height / rect.height);

    drawPointsRef.current.push([x, y]);
  };

  const handleLassoEnd = () => {
    if (activeTool !== 'lasso' || drawPointsRef.current.length < 3) return;
    setIsDrawing(false);

    const selection = lassoSelection(drawPointsRef.current);
    applySelectionMode(selection);
    toast.success(`Lasso: ${selection.pixels.length} pixels selected`);
  };

  const handleAutoDetect = () => {
    const imageData = getImageDataFromCanvas();
    if (!imageData) {
      toast.error('No canvas available');
      return;
    }

    toast.loading('Detecting areas...');
    const areas = autoDetectAreas(imageData);

    if (areas.length === 0) {
      toast.dismiss();
      toast.error('No areas detected');
      return;
    }

    let selection = areas[0];
    for (let i = 1; i < areas.length; i++) {
      selection = combineSelections(selection, areas[i], 'add');
    }

    setCurrentSelection(selection);
    onSelectionChange?.(selection);
    toast.dismiss();
    toast.success(`Auto-detected ${areas.length} areas`);
  };

  const applySelectionMode = (newSelection) => {
    let final = newSelection;

    if (currentSelection) {
      if (selectionMode === 'add') {
        final = combineSelections(currentSelection, newSelection, 'add');
      } else if (selectionMode === 'subtract') {
        final = combineSelections(currentSelection, newSelection, 'subtract');
      } else if (selectionMode === 'intersect') {
        final = combineSelections(currentSelection, newSelection, 'intersect');
      }
    }

    if (featherRadius > 0) {
      final = featherSelection(final, featherRadius);
    }

    setCurrentSelection(final);
    onSelectionChange?.(final);
  };

  const handleInvert = () => {
    if (!currentSelection) return;
    const imageData = getImageDataFromCanvas();
    const inverted = invertSelection(currentSelection, imageData.width, imageData.height);
    setCurrentSelection(inverted);
    onSelectionChange?.(inverted);
    toast.success('Selection inverted');
  };

  const handleClearSelection = () => {
    setCurrentSelection(null);
    onSelectionChange?.(null);
    toast.success('Selection cleared');
  };

  // Mouse listeners
  useEffect(() => {
    const canvas = externalOverlayCanvasRef?.current || (useTestImage ? testCanvasRef : canvasRef)?.current;
    if (!canvas) return;

    const handleMouseDown = (e) => {
      if (activeTool === 'magic-wand') handleMagicWand(e);
      else if (activeTool === 'brush') handleBrushStart(e);
      else if (activeTool === 'rectangle') handleRectangleStart(e);
      else if (activeTool === 'circle') handleCircleStart(e);
      else if (activeTool === 'lasso') handleLassoStart(e);
    };

    const handleMouseMove = (e) => {
      if (activeTool === 'brush') handleBrushMove(e);
      else if (activeTool === 'lasso') handleLassoMove(e);
    };

    const handleMouseUp = (e) => {
      if (activeTool === 'brush') handleBrushEnd();
      else if (activeTool === 'rectangle') handleRectangleEnd(e);
      else if (activeTool === 'circle') handleCircleEnd(e);
      else if (activeTool === 'lasso') handleLassoEnd();
    };

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [activeTool, isDrawing, currentSelection, selectionMode, featherRadius, brushSize, tolerance, useTestImage]);

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
      {!hasCanvas && (
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
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'magic-wand', label: '✨ Magic Wand' },
            { id: 'brush', label: '🖌️ Brush' },
            { id: 'rectangle', label: '⬜ Rectangle' },
            { id: 'circle', label: '⭕ Circle' },
            { id: 'lasso', label: '🔗 Lasso' }
          ].map(tool => (
            <button
              key={tool.id}
              onClick={() => setActiveTool(tool.id)}
              className={`py-3 px-3 rounded-lg font-bold text-sm transition-all ${
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
          className="w-full py-3 bg-purple-100 text-purple-700 font-bold rounded-lg hover:bg-purple-200 transition-all"
        >
          🤖 Auto Detect Areas
        </button>
      </div>

      {/* SELECTION MODE */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Selection Mode</label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'replace', label: 'Replace' },
            { id: 'add', label: '+ Add' },
            { id: 'subtract', label: '- Subtract' },
            { id: 'intersect', label: '∩ Intersect' }
          ].map(mode => (
            <button
              key={mode.id}
              onClick={() => setSelectionMode(mode.id)}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                selectionMode === mode.id
                  ? 'bg-blue-600 text-white'
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
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Color Tolerance: {tolerance}
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={tolerance}
            onChange={(e) => setTolerance(Number(e.target.value))}
            className="w-full"
          />
          <p className="text-xs text-slate-500">Higher = select more similar colors</p>
        </div>
      )}

      {activeTool === 'brush' && (
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Brush Size: {brushSize}px
          </label>
          <input
            type="range"
            min="1"
            max="50"
            value={brushSize}
            onChange={(e) => setBrushSize(Number(e.target.value))}
            className="w-full"
          />
        </div>
      )}

      {/* FEATHER SELECTION */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Feather: {featherRadius}px
        </label>
        <input
          type="range"
          min="0"
          max="50"
          value={featherRadius}
          onChange={(e) => setFeatherRadius(Number(e.target.value))}
          className="w-full"
        />
        <p className="text-xs text-slate-500">Soften selection edges</p>
      </div>

      {/* SELECTION OPERATIONS */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Operations</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleInvert}
            disabled={!currentSelection}
            className="py-2 px-3 bg-slate-100 text-slate-700 font-bold rounded-lg text-sm hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            ↔️ Invert
          </button>
          <button
            onClick={handleClearSelection}
            disabled={!currentSelection}
            className="py-2 px-3 bg-red-100 text-red-700 font-bold rounded-lg text-sm hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            🗑️ Clear
          </button>
        </div>
      </div>

      {/* SELECTION INFO */}
      {currentSelection && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs font-bold text-blue-900">
            ✓ {currentSelection.pixels.length.toLocaleString()} pixels selected
          </p>
          <p className="text-xs text-blue-700">Type: {currentSelection.type}</p>
        </div>
      )}

      {/* TEST CANVAS */}
      {useTestImage && (
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase">Test Image</label>
          <canvas ref={testCanvasRef} className="w-full border-2 border-slate-300 rounded-lg" />
        </div>
      )}

      {/* OVERLAY CANVAS */}
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

      {/* INSTRUCTIONS */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-xs text-indigo-900 space-y-1">
        <p className="font-bold">💡 How to use:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>Choose a tool from the list above</li>
          <li>Adjust settings (tolerance, brush size, etc.)</li>
          <li>Click or drag on the image to create selection</li>
          <li>View preview below</li>
          <li>Use operations like Invert to modify selection</li>
        </ol>
      </div>
    </div>
  );
}

