import { useState, useEffect, useRef, useCallback } from 'react';
import { collection, doc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, IMGBB_API_KEY } from '../config/firebase';
import { Rnd } from 'react-rnd';
import toast from 'react-hot-toast';
import imageCompression from 'browser-image-compression';
import SelectionTools from './SelectionTools';
import AdvancedImageEditor from './AdvancedImageEditor';
import { autoDetectAreas } from '../utils/selectionAlgorithms';

const FONT_FAMILIES = [
  'Arial, sans-serif', 'Impact, sans-serif', '"Montserrat", sans-serif', '"Poppins", sans-serif',
  '"Inter", sans-serif', '"Roboto", sans-serif', '"Oswald", sans-serif', '"Playfair Display", serif',
  '"Lora", serif', '"Noto Sans", sans-serif', '"Cairo", sans-serif'
];

const BG_COLORS = [
  '#FFFFFF', '#000000', '#1e293b', '#0f172a', '#312e81',
  '#4f46e5', '#7c3aed', '#dc2626', '#ea580c', '#16a34a',
  '#0891b2', '#be185d', '#f59e0b', '#64748b', '#f1f5f9',
];

export default function ProEditor({
  initialCampaign,
  userEmail,
  onClose
}) {
  // --- CORE STATE ---
  const [campaignTitle, setCampaignTitle] = useState(initialCampaign?.title || '');
  const [bgImage, setBgImage] = useState(initialCampaign?.backgroundImage || null);
  const [bgImageFile, setBgImageFile] = useState(null);
  const [bgColor, setBgColor] = useState(initialCampaign?.bgColor || '#FFFFFF');
  const [canvasWidth, setCanvasWidth] = useState(initialCampaign?.canvasWidth || 800);
  const [canvasHeight, setCanvasHeight] = useState(initialCampaign?.canvasHeight || 1066);
  const [campaignId, setCampaignId] = useState(initialCampaign?.id || null);

  const [selectedId, setSelectedId] = useState(null);
  const [editTab, setEditTab] = useState('add');
  const [isSaving, setIsSaving] = useState(false);
  const [currentSelection, setCurrentSelection] = useState(null);
  const [showEffectsEditor, setShowEffectsEditor] = useState(false);
  const [isPublic, setIsPublic] = useState(initialCampaign?.isPublic || false);
  const [showPublishModal, setShowPublishModal] = useState(false);

  // Scale factor: how much canvas content is scaled down for display
  const [canvasScale, setCanvasScale] = useState(1);

  const studioCanvasRef = useRef(null);
  const selectionOverlayRef = useRef(null);
  const canvasContainerRef = useRef(null);
  const bgFileInputRef = useRef(null);

  // ==========================================
  // 1. UNDO / REDO ENGINE (HISTORY STACK)
  // ==========================================
  const [history, setHistory] = useState([initialCampaign?.elements || []]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const elements = history[historyIndex];

  const updateElementsWithHistory = useCallback((newElements) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newElements);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) setHistoryIndex(prev => prev - 1);
  }, [historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) setHistoryIndex(prev => prev + 1);
  }, [history, historyIndex]);

  // Keyboard Shortcuts (Ctrl+Z / Ctrl+Y)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't hijack shortcuts when typing in inputs
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) deleteElement(selectedId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, selectedId]);

  // ==========================================
  // CANVAS SCALE DETECTION
  // Calculates how much the canvas is shrunk for display so we can scale
  // element positions/sizes correctly.
  // ==========================================
  useEffect(() => {
    const computeScale = () => {
      if (canvasContainerRef.current && canvasWidth > 0) {
        const containerW = canvasContainerRef.current.offsetWidth;
        setCanvasScale(containerW / canvasWidth);
      }
    };
    computeScale();
    const ro = new ResizeObserver(computeScale);
    if (canvasContainerRef.current) ro.observe(canvasContainerRef.current);
    return () => ro.disconnect();
  }, [canvasWidth]);

  // ==========================================
  // CANVAS BG DRAW
  // ==========================================
  useEffect(() => {
    const canvas = studioCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (bgImage) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.src = bgImage;
    } else {
      // Use background color
      ctx.fillStyle = bgColor || '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }, [bgImage, bgColor, canvasWidth, canvasHeight]);

  // ==========================================
  // 2. AUTO-SAVE ENGINE (DEBOUNCED)
  // ==========================================
  useEffect(() => {
    if (!campaignId) return;

    const autoSaveTimer = setTimeout(async () => {
      try {
        await updateDoc(doc(db, 'campaigns', campaignId), {
          title: campaignTitle,
          elements,
          canvasWidth,
          canvasHeight,
          bgColor,
          isPublic,
          updatedAt: serverTimestamp(),
        });
        toast.success('Draft Auto-Saved', { id: 'autosave', icon: '💾', duration: 2000 });
      } catch (error) {
        console.error('Auto-save failed', error);
      }
    }, 3000);

    return () => clearTimeout(autoSaveTimer);
  }, [elements, campaignTitle, canvasWidth, canvasHeight, bgColor, isPublic, campaignId]);

  // ==========================================
  // ELEMENT CONTROLS
  // ==========================================
  const getNextZIndex = () => elements.length > 0 ? Math.max(...elements.map(el => el.zIndex || 1)) + 1 : 10;

  const addTextElement = () => {
    updateElementsWithHistory([...elements, {
      id: Date.now().toString(), type: 'text',
      x: 50, y: 50, width: 250, height: 80,
      text: 'Tap to Edit', color: '#ffffff', fontSize: 36,
      fontFamily: '"Montserrat", sans-serif', textAlign: 'center',
      opacity: 1, zIndex: getNextZIndex(), rotation: 0, isLocked: false,
      fontWeight: 'bold', fontStyle: 'normal', textTransform: 'none',
      letterSpacing: 0, lineHeight: 1.2, textStrokeWidth: 0,
      textStrokeColor: '#000000', shadowColor: 'rgba(0,0,0,0.5)',
      shadowBlur: 4, shadowOffsetX: 0, shadowOffsetY: 2
    }]);
    setEditTab('main');
    setSelectedId(null);
  };

  const addShapeElement = () => {
    updateElementsWithHistory([...elements, {
      id: Date.now().toString(), type: 'shape',
      x: 50, y: 200, width: 200, height: 100,
      backgroundColor: '#000000', opacity: 0.5, borderRadius: 0,
      zIndex: getNextZIndex(), rotation: 0, isLocked: false,
      borderWidth: 0, borderColor: '#ffffff',
      shadowColor: 'transparent', shadowBlur: 0, shadowOffsetX: 0, shadowOffsetY: 0
    }]);
    setEditTab('main');
    setSelectedId(null);
  };

  const addPhotoFrame = () => {
    updateElementsWithHistory([...elements, {
      id: Date.now().toString(), type: 'photo',
      x: 100, y: 100, width: 160, height: 160,
      borderRadius: 10, backgroundColor: '#e2e8f0',
      borderColor: '#ffffff', borderWidth: 0, opacity: 1,
      zIndex: getNextZIndex(), rotation: 0, isLocked: false,
      filterBrightness: 100, filterContrast: 100,
      filterSaturation: 100, filterBlur: 0
    }]);
    setEditTab('main');
    setSelectedId(null);
  };

  const updateElement = (id, newProps) => updateElementsWithHistory(elements.map(el => (el.id === id ? { ...el, ...newProps } : el)));
  const deleteElement = (id) => { updateElementsWithHistory(elements.filter(el => el.id !== id)); if (selectedId === id) setSelectedId(null); };
  const duplicateElement = () => {
    if (!selectedId) return;
    const el = elements.find(e => e.id === selectedId);
    if (!el) return;
    const newId = Date.now().toString();
    updateElementsWithHistory([...elements, { ...el, id: newId, x: el.x + 20, y: el.y + 20, zIndex: getNextZIndex() }]);
    setSelectedId(newId);
    toast.success('Layer duplicated.');
  };

  const moveLayerUp = (id) => { const el = elements.find(e => e.id === id); if (el) updateElement(id, { zIndex: (el.zIndex || 1) + 1 }); };
  const moveLayerDown = (id) => { const el = elements.find(e => e.id === id); if (el) updateElement(id, { zIndex: Math.max(1, (el.zIndex || 1) - 1) }); };

  // ==========================================
  // BACKGROUND IMAGE UPLOAD (with ImgBB compression)
  // ==========================================
  const handleBgUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';

    const toastId = toast.loading('Optimizing image...');
    try {
      const options = { maxSizeMB: 1.5, maxWidthOrHeight: 2500, useWebWorker: true };
      const compressed = await imageCompression(file, options);
      setBgImageFile(compressed);
      const url = URL.createObjectURL(compressed);
      setBgImage(url);

      const img = new Image();
      img.onload = () => {
        setCanvasWidth(img.naturalWidth);
        setCanvasHeight(img.naturalHeight);
      };
      img.src = url;
      toast.success('Background uploaded!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to process image.', { id: toastId });
    }
  };

  const removeBgImage = () => {
    setBgImage(null);
    setBgImageFile(null);
  };

  // ==========================================
  // SELECTION TOOLS
  // ==========================================
  const getCanvasImageData = () => {
    const canvas = studioCanvasRef.current;
    if (!canvas) return null;
    try {
      return canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    } catch (error) {
      console.error('Unable to read canvas image data:', error);
      return null;
    }
  };

  const handleQuickSelect = (mode) => {
    setEditTab('select');
    toast.success(`Opened tools for ${mode} selection. Try the Magic Wand!`);
  };

  const handleCreateUploadArea = () => {
    if (!currentSelection || !studioCanvasRef.current || !bgImage) {
      toast.error("Please upload a background and make a selection first.");
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    currentSelection.pixels.forEach(([x, y]) => {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    });

    const w = maxX - minX;
    const h = maxY - minY;

    // Generate a mask image from the selection instead of a hole punch
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = w + 1;
    maskCanvas.height = h + 1;
    const maskCtx = maskCanvas.getContext('2d');
    maskCtx.fillStyle = '#000000'; // Opaque black for the mask
    
    currentSelection.pixels.forEach(([x, y]) => {
      // Draw at offset so the mask is tightly cropped to the bounding box
      maskCtx.fillRect(x - minX, y - minY, 1, 1);
    });
    
    const maskDataUrl = maskCanvas.toDataURL('image/png');

    // Create the normal photo element with the mask applied
    const newElement = {
      id: 'photo_' + Date.now(),
      type: 'photo',
      x: minX,
      y: minY,
      width: w || 100,
      height: h || 100,
      backgroundColor: '#e2e8f0',
      borderRadius: 0,
      zIndex: getNextZIndex(), 
      isBackgroundLayer: false, // Normal layer now!
      maskImage: maskDataUrl, // The base64 shape mask
    };
    
    updateElementsWithHistory([...elements, newElement]);
    setCurrentSelection(null);
    setSelectedId(newElement.id);
    setEditTab('style');
    toast.success('Created photo upload area!');
  };

  const handleCreateTextArea = () => {
    if (!currentSelection || !studioCanvasRef.current) {
      toast.error("Please make a selection first.");
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    currentSelection.pixels.forEach(([x, y]) => {
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    });

    const w = maxX - minX;
    const h = maxY - minY;

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = w + 1;
    maskCanvas.height = h + 1;
    const maskCtx = maskCanvas.getContext('2d');
    maskCtx.fillStyle = '#000000';
    currentSelection.pixels.forEach(([x, y]) => {
      maskCtx.fillRect(x - minX, y - minY, 1, 1);
    });
    const maskDataUrl = maskCanvas.toDataURL('image/png');

    const newElement = {
      id: 'text_' + Date.now(),
      type: 'text',
      x: minX,
      y: minY,
      width: w || 200,
      height: h || 80,
      text: 'Tap to Edit',
      color: '#ffffff',
      fontSize: Math.max(12, Math.floor((h || 80) * 0.8)),
      fontFamily: '"Montserrat", sans-serif',
      textAlign: 'center',
      opacity: 1,
      zIndex: getNextZIndex(),
      rotation: 0,
      isLocked: false,
      fontWeight: 'bold',
      fontStyle: 'normal',
      textTransform: 'none',
      letterSpacing: 0,
      lineHeight: 1.2,
      textStrokeWidth: 0,
      textStrokeColor: '#000000',
      shadowColor: 'rgba(0,0,0,0.5)',
      shadowBlur: 4,
      shadowOffsetX: 0,
      shadowOffsetY: 2,
      maskImage: maskDataUrl, // The base64 shape mask for text
    };
    
    updateElementsWithHistory([...elements, newElement]);
    setCurrentSelection(null);
    setSelectedId(newElement.id);
    setEditTab('text');
    toast.success('Created text area!');
  };

  const selectedElement = elements.find(el => el.id === selectedId);

  // ==========================================
  // PUBLISH (Manual Save + ImgBB Upload)
  // ==========================================
  const triggerPublish = () => {
    if (!campaignTitle.trim()) return toast.error('Please enter a campaign title first.');
    setShowPublishModal(true);
  };

  const confirmPublish = async () => {
    setShowPublishModal(false);
    setIsSaving(true);
    const toastId = toast.loading('Publishing campaign...');

    try {
      let publicImageUrl = bgImage;

      // Upload to ImgBB if we have a new local file or a modified base64 image
      if (bgImageFile || (bgImage && bgImage.startsWith('data:image/'))) {
        const formData = new FormData();
        if (bgImageFile) {
          formData.append('image', bgImageFile, 'image.png');
        } else {
          const byteString = atob(bgImage.split(',')[1]);
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
              ia[i] = byteString.charCodeAt(i);
          }
          const blob = new Blob([ab], { type: 'image/png' });
          formData.append('image', blob, 'image.png');
        }
        
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (!data.success) throw new Error('Image hosting rejected the file.');
        publicImageUrl = data.data.url;
        setBgImage(publicImageUrl);
        setBgImageFile(null);
      }

      const payload = {
        ownerEmail: userEmail || '',
        title: campaignTitle,
        backgroundImage: publicImageUrl || null,
        bgColor,
        elements,
        canvasWidth,
        canvasHeight,
        isPublic,
        updatedAt: serverTimestamp(),
      };

      if (campaignId) {
        await updateDoc(doc(db, 'campaigns', campaignId), payload);
      } else {
        const docRef = await addDoc(collection(db, 'campaigns'), {
          ...payload,
          createdAt: serverTimestamp(),
          views: 0,
          postersGenerated: 0,
        });
        setCampaignId(docRef.id);
      }

      toast.success('Campaign Published!', { id: toastId });
    } catch (e) {
      console.error('Save failed', e);
      toast.error('Failed to publish. Check console.', { id: toastId });
    } finally {
      setIsSaving(false);
    }
  };

  // ==========================================
  // CANVAS SIZE PRESETS
  // ==========================================
  const sizePresets = [
    { label: 'Portrait', w: 800, h: 1066 },
    { label: 'Square', w: 1080, h: 1080 },
    { label: 'Story', w: 1080, h: 1920 },
    { label: 'Landscape', w: 1280, h: 720 },
    { label: 'A4', w: 794, h: 1123 },
  ];

  // When tab changes based on selection
  useEffect(() => {
    if (selectedId) setEditTab('text');
    else setEditTab('add');
  }, [selectedId]);

  return (
    <div className="animate-in fade-in flex flex-col bg-[#F1F5F9] fixed inset-0 z-50 overflow-hidden">

      {/* ==============================
          HEADER
      ============================== */}
      <div className="bg-white px-3 md:px-6 py-3 border-b border-slate-200 flex justify-between items-center shadow-sm shrink-0 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onClose}
            className="w-9 h-9 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-full flex items-center justify-center font-bold transition shrink-0 text-lg"
          >←</button>
          <input
            type="text"
            value={campaignTitle}
            onChange={(e) => setCampaignTitle(e.target.value)}
            className="font-black text-slate-800 text-base md:text-lg outline-none bg-transparent hover:bg-slate-50 focus:bg-slate-50 px-2 py-1 rounded min-w-0 w-32 md:w-56"
            placeholder="Campaign Title..."
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Undo/Redo */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={handleUndo}
              disabled={historyIndex === 0}
              className="w-8 h-8 flex items-center justify-center rounded text-slate-600 hover:bg-white hover:shadow-sm disabled:opacity-30 transition-all"
              title="Undo (Ctrl+Z)"
            >↩</button>
            <button
              onClick={handleRedo}
              disabled={historyIndex === history.length - 1}
              className="w-8 h-8 flex items-center justify-center rounded text-slate-600 hover:bg-white hover:shadow-sm disabled:opacity-30 transition-all"
              title="Redo (Ctrl+Y)"
            >↪</button>
          </div>

          {/* Duplicate selected */}
          {selectedId && (
            <button
              onClick={duplicateElement}
              className="hidden md:flex items-center gap-1 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-2 rounded-lg transition"
            >⧉ Duplicate</button>
          )}

          <button
            onClick={triggerPublish}
            disabled={isSaving}
            className="bg-indigo-600 text-white font-bold py-2 px-4 md:px-6 rounded-lg text-sm shadow-md hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-60"
          >
            {isSaving ? 'Saving...' : <><span>💾</span><span className="hidden md:inline">Publish</span></>}
          </button>
        </div>
      </div>

      {/* ==============================
          WORKSPACE
      ============================== */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">

        {/* CANVAS AREA */}
        <div
          className="flex-1 flex items-center justify-center p-4 md:p-8 relative overflow-auto bg-[#e8edf5]"
          onClick={(e) => {
            if (e.target === e.currentTarget && currentSelection) setCurrentSelection(null);
            setSelectedId(null);
          }}
        >
          {/* Dot grid pattern */}
          <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />

          {/* Canvas wrapper — scales content via CSS, acts as coordinate reference for RND */}
          <div
            ref={canvasContainerRef}
            className="relative shadow-[0_20px_60px_rgba(0,0,0,0.2)] ring-1 ring-slate-300/60 rounded-lg overflow-hidden z-10"
            style={{
              width: '100%',
              maxWidth: Math.min(canvasWidth, 420),
              aspectRatio: `${canvasWidth} / ${canvasHeight}`,
            }}
            onClick={(e) => {
              // Deselect if clicking directly on the canvas overlay/background
              if (e.target === selectionOverlayRef.current || e.target === canvasContainerRef.current) {
                if (currentSelection && editTab !== 'select') setCurrentSelection(null);
                setSelectedId(null);
              }
            }}
          >
            {/* Background canvas (renders bg image or color) */}
            <canvas
              ref={studioCanvasRef}
              className="absolute inset-0 w-full h-full block pointer-events-none"
              style={{ display: 'block', zIndex: 10 }}
            />

            {/* INTERACTIVE OVERLAY CANVAS (FOR SELECTION TOOLS) */}
            <canvas
              ref={selectionOverlayRef}
              className={`absolute inset-0 w-full h-full block ${editTab === 'select' ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'}`}
              style={{ display: 'block', zIndex: 50 }}
            />

            {/* Blank canvas placeholder overlay (when no image) */}
            {!bgImage && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 cursor-pointer group z-10 bg-slate-100/50"
                onClick={() => { setEditTab('bg'); bgFileInputRef.current?.click(); }}
              >
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl bg-slate-800 text-white group-hover:bg-indigo-600 transition shadow-lg">
                  🖼️
                </div>
                <p className="text-sm font-bold text-slate-700 group-hover:text-indigo-700 transition drop-shadow-sm text-center px-4">
                  Click to upload background
                </p>
              </div>
            )}

            {/* Draggable / Resizable Elements — positioned relative to the scaled container */}
            <div className="absolute inset-0 pointer-events-none">
              {elements.map((el) => (
                <Rnd
                  key={el.id}
                  size={{
                    width: el.width * canvasScale,
                    height: el.height * canvasScale,
                  }}
                  position={{
                    x: el.x * canvasScale,
                    y: el.y * canvasScale,
                  }}
                  onDragStop={(e, d) => updateElement(el.id, {
                    x: Math.round(d.x / canvasScale),
                    y: Math.round(d.y / canvasScale),
                  })}
                  onResizeStop={(e, direction, ref, delta, position) => updateElement(el.id, {
                    width: Math.round(parseInt(ref.style.width, 10) / canvasScale),
                    height: Math.round(parseInt(ref.style.height, 10) / canvasScale),
                    x: Math.round(position.x / canvasScale),
                    y: Math.round(position.y / canvasScale),
                  })}
                  bounds="parent"
                  disableDragging={el.isLocked}
                  enableResizing={el.isLocked ? false : undefined}
                  onClick={(e) => { e.stopPropagation(); setSelectedId(el.id); setEditTab(el.type === 'text' ? 'text' : 'style'); }}
                  className={`absolute flex items-center cursor-move touch-none transition-shadow ${selectedId === el.id ? 'ring-2 ring-indigo-500 ring-offset-0 shadow-xl' : ''}`}
                  style={{ zIndex: el.isBackgroundLayer ? 5 : (el.zIndex || 20), pointerEvents: 'auto' }}
                >
                  <div style={{
                    width: '100%', height: '100%', display: 'flex',
                    transform: `rotate(${el.rotation || 0}deg)`,
                    opacity: el.opacity ?? 1,
                    ...(el.type === 'text' && {
                      color: el.color,
                      fontSize: `${el.fontSize * canvasScale}px`,
                      fontFamily: el.fontFamily || '"Montserrat", sans-serif',
                      textAlign: el.textAlign || 'center',
                      alignItems: 'center',
                      justifyContent: el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'flex-end' : 'flex-start',
                      fontWeight: el.fontWeight || 'bold',
                      fontStyle: el.fontStyle || 'normal',
                      letterSpacing: `${(el.letterSpacing || 0) * canvasScale}px`,
                      lineHeight: el.lineHeight || 1.2,
                      whiteSpace: 'pre-wrap',
                      WebkitTextStroke: `${(el.textStrokeWidth || 0) * canvasScale}px ${el.textStrokeColor || '#000000'}`,
                      textShadow: `${(el.shadowOffsetX || 0) * canvasScale}px ${(el.shadowOffsetY || 2) * canvasScale}px ${(el.shadowBlur !== undefined ? el.shadowBlur : 4) * canvasScale}px ${el.shadowColor || 'rgba(0,0,0,0.5)'}`,
                    }),
                    ...(el.type === 'shape' && {
                      backgroundColor: el.backgroundColor,
                      borderRadius: `${el.borderRadius || 0}px`,
                      border: `${(el.borderWidth || 0) * canvasScale}px solid ${el.borderColor || 'transparent'}`,
                      boxShadow: `${(el.shadowOffsetX || 0) * canvasScale}px ${(el.shadowOffsetY || 0) * canvasScale}px ${(el.shadowBlur || 0) * canvasScale}px ${el.shadowColor || 'transparent'}`,
                    }),
                    ...(el.type === 'photo' && {
                      backgroundColor: el.backgroundColor || '#e2e8f0',
                      borderRadius: `${el.borderRadius || 0}%`,
                      filter: `brightness(${el.filterBrightness ?? 100}%) blur(${(el.filterBlur || 0) * canvasScale}px)`,
                      ...(el.maskImage ? {
                         WebkitMaskImage: `url(${el.maskImage})`,
                         WebkitMaskSize: '100% 100%',
                         maskImage: `url(${el.maskImage})`,
                         maskSize: '100% 100%',
                         backgroundColor: 'rgba(0,0,0,0.3)',
                      } : {})
                    }),
                  }}>
                    {el.type === 'text' ? el.text
                      : el.type === 'photo'
                      ? <span className="text-indigo-800 font-black text-[10px] bg-white/80 px-3 py-1 rounded m-auto shadow-sm text-center">USER PHOTO<br/>UPLOAD AREA</span>
                      : null}
                  </div>
                </Rnd>
              ))}
            </div>
          </div>
        </div>

        {/* ==============================
            TOOLBAR / PANEL
        ============================== */}
        <div className="w-full md:w-80 bg-white border-t md:border-l border-slate-200 flex flex-col h-[45vh] md:h-full z-20 shrink-0 overflow-hidden">

          {/* Tab bar */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 bg-slate-50 shrink-0 gap-2 overflow-x-auto">
            {!selectedId ? (
              <div className="flex gap-1 bg-slate-200/60 p-0.5 rounded-lg shrink-0">
                {[
                  { id: 'add', label: '+ Add' },
                  { id: 'bg', label: '🖼 BG' },
                  { id: 'canvas', label: '📐 Size' },
                  { id: 'layers', label: '⊕ Layers' },
                  { id: 'select', label: '🪄 Select' },
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setEditTab(t.id)}
                    className={`text-[10px] font-black uppercase px-2 py-1.5 rounded-md whitespace-nowrap transition-colors ${editTab === t.id ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                  >{t.label}</button>
                ))}
              </div>
            ) : (
              <div className="flex gap-1 bg-slate-200/60 p-0.5 rounded-lg overflow-x-auto shrink-0">
                {[
                  ...(selectedElement?.type === 'text' ? [{ id: 'text', label: '✏️ Text' }] : []),
                  { id: 'style', label: '🎨 Style' },
                  ...(selectedElement?.type === 'photo' ? [{ id: 'filters', label: '🪄 Filter' }] : []),
                  { id: 'effects', label: '✨ Fx' },
                  { id: 'arrange', label: '📐 Arrange' },
                ].map(t => (
                  <button
                    key={t.id}
                    onClick={() => setEditTab(t.id)}
                    className={`text-[10px] font-black uppercase px-2 py-1.5 rounded-md whitespace-nowrap transition-colors ${editTab === t.id ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                  >{t.label}</button>
                ))}
              </div>
            )}

            {selectedElement && (
              <button
                onClick={() => deleteElement(selectedId)}
                className="text-red-500 text-xs font-bold px-2 py-1.5 hover:bg-red-50 rounded-lg transition-colors shrink-0"
              >🗑️</button>
            )}
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-5">

            {/* -------- ADD -------- */}
            {!selectedId && editTab === 'add' && (
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Add Element</p>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={addTextElement} className="py-6 bg-slate-50 border border-slate-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 flex flex-col items-center gap-2 font-bold text-sm text-slate-700 shadow-sm transition-all">
                    <span className="text-2xl font-black text-indigo-600">T</span>Text
                  </button>
                  <button onClick={addPhotoFrame} className="py-6 bg-slate-50 border border-slate-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 flex flex-col items-center gap-2 font-bold text-sm text-slate-700 shadow-sm transition-all">
                    <span className="text-2xl">🖼️</span>Photo
                  </button>
                  <button onClick={addShapeElement} className="py-6 bg-slate-50 border border-slate-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 flex flex-col items-center gap-2 font-bold text-sm text-slate-700 shadow-sm col-span-2 transition-all">
                    <span className="text-2xl">⬛</span>Shape
                  </button>
                </div>
              </div>
            )}

            {/* -------- BACKGROUND -------- */}
            {!selectedId && editTab === 'bg' && (
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Background Image</p>
                  <input ref={bgFileInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />

                  {bgImage ? (
                    <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-sm">
                      <img src={bgImage} className="w-full h-28 object-cover" alt="Background preview" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition flex items-center justify-center gap-2">
                        <button onClick={() => bgFileInputRef.current?.click()} className="bg-white text-slate-800 font-bold text-xs px-3 py-1.5 rounded-lg shadow">Replace</button>
                        <button onClick={removeBgImage} className="bg-red-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow">Remove</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => bgFileInputRef.current?.click()}
                      className="w-full py-8 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center gap-2 text-slate-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all font-bold text-sm"
                    >
                      <span className="text-3xl">📂</span>
                      Upload Background Image
                    </button>
                  )}
                </div>

                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Canvas Color (when no image)</p>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {BG_COLORS.map(c => (
                      <button
                        key={c}
                        onClick={() => setBgColor(c)}
                        className={`w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110 ${bgColor === c ? 'border-indigo-500 scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-12 h-10 border border-slate-200 rounded-lg cursor-pointer" />
                    <span className="text-sm font-bold text-slate-600">{bgColor}</span>
                  </div>
                </div>
              </div>
            )}

            {/* -------- CANVAS SIZE -------- */}
            {!selectedId && editTab === 'canvas' && (
              <div className="space-y-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Canvas Size</p>
                <div className="grid grid-cols-1 gap-2">
                  {sizePresets.map(p => (
                    <button
                      key={p.label}
                      onClick={() => { setCanvasWidth(p.w); setCanvasHeight(p.h); }}
                      className={`flex justify-between items-center px-4 py-3 rounded-xl border font-bold text-sm transition-all ${canvasWidth === p.w && canvasHeight === p.h ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 hover:border-indigo-300 text-slate-600'}`}
                    >
                      <span>{p.label}</span>
                      <span className="text-[10px] font-black text-slate-400">{p.w}×{p.h}</span>
                    </button>
                  ))}
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Custom Size</p>
                  <div className="flex gap-2 items-center">
                    <div className="flex-1">
                      <label className="text-[9px] font-black text-slate-400 block mb-1">Width (px)</label>
                      <input type="number" value={canvasWidth} onChange={e => setCanvasWidth(Number(e.target.value))} className="w-full border border-slate-200 p-2 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div className="text-slate-400 font-bold mt-4">×</div>
                    <div className="flex-1">
                      <label className="text-[9px] font-black text-slate-400 block mb-1">Height (px)</label>
                      <input type="number" value={canvasHeight} onChange={e => setCanvasHeight(Number(e.target.value))} className="w-full border border-slate-200 p-2 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* -------- LAYERS -------- */}
            {editTab === 'layers' && (
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Layer Stack</p>
                {[...elements].sort((a, b) => b.zIndex - a.zIndex).map(el => (
                  <div
                    key={el.id}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${selectedId === el.id ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                    onClick={() => { setSelectedId(el.id); setEditTab(el.type === 'text' ? 'text' : 'style'); }}
                  >
                    <div className="flex items-center gap-2">
                      <span>{el.type === 'text' ? 'T' : el.type === 'photo' ? '🖼️' : '⬛'}</span>
                      <span className="font-bold text-sm truncate max-w-[120px]">
                        {el.type === 'text' ? el.text.substring(0, 18) : el.type.toUpperCase()}
                      </span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); updateElement(el.id, { isLocked: !el.isLocked }); }}
                      className="text-slate-400 hover:text-slate-700"
                    >{el.isLocked ? '🔒' : '🔓'}</button>
                  </div>
                ))}
                {elements.length === 0 && (
                  <p className="text-center text-slate-400 text-sm py-8">No layers yet. Add elements from the "Add" tab.</p>
                )}
              </div>
            )}

            {/* -------- SELECTION TOOLS -------- */}
            {editTab === 'select' && (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h3 className="font-bold text-slate-800 text-sm mb-2">Selection Tools</h3>
                  <p className="text-xs text-slate-500 mb-4">Select areas of your background to apply effects or convert to upload areas.</p>
                  
                  {/* Embedded Selection Tools */}
                  <div className="mb-4">
                    <SelectionTools
                      isEmbedded={true}
                      externalOverlayCanvasRef={selectionOverlayRef}
                      canvasRef={studioCanvasRef}
                      initialSelection={currentSelection}
                      onSelectionChange={setCurrentSelection}
                    />
                  </div>
                  
                  {currentSelection && (
                    <div>
                      <div className="flex justify-between items-center bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg mb-4 text-xs font-bold border border-indigo-100">
                        <span>✓ Selection Active</span>
                        <button onClick={() => setCurrentSelection(null)} className="text-red-500 hover:text-red-600 uppercase tracking-wider text-[10px] py-1 px-2 border border-red-200 rounded-md bg-white">Deselect</button>
                      </div>
                      <button onClick={() => setShowEffectsEditor(true)} className="w-full py-4 bg-indigo-600 border border-transparent rounded-xl hover:bg-indigo-700 flex items-center justify-center gap-2 font-bold text-sm text-white shadow-sm transition-all">
                        <span>✨</span> Apply Effects to Selection
                      </button>
                      <button onClick={handleCreateUploadArea} className="w-full py-4 mt-3 bg-emerald-600 border border-transparent rounded-xl hover:bg-emerald-700 flex items-center justify-center gap-2 font-bold text-sm text-white shadow-sm transition-all">
                        <span>🕳️</span> Convert to Photo Upload Area
                      </button>
                      <button onClick={handleCreateTextArea} className="w-full py-4 mt-3 bg-blue-600 border border-transparent rounded-xl hover:bg-blue-700 flex items-center justify-center gap-2 font-bold text-sm text-white shadow-sm transition-all">
                        <span>📝</span> Convert to Text Area
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* -------- TEXT EDITING -------- */}
            {editTab === 'text' && selectedElement?.type === 'text' && (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Content</label>
                  <textarea
                    value={selectedElement.text}
                    onChange={(e) => updateElement(selectedId, { text: e.target.value })}
                    rows={4}
                    className="w-full border border-slate-200 p-3 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm resize-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Font Family</label>
                  <select
                    value={selectedElement.fontFamily}
                    onChange={(e) => updateElement(selectedId, { fontFamily: e.target.value })}
                    className="w-full border border-slate-200 p-2 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {FONT_FAMILIES.map(f => <option key={f} value={f} style={{ fontFamily: f }}>{f.split(',')[0].replace(/"/g, '')}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Font Size</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="range" min="8" max="200" step="1"
                      value={selectedElement.fontSize}
                      onChange={(e) => updateElement(selectedId, { fontSize: Number(e.target.value) })}
                      className="flex-1 accent-indigo-500"
                    />
                    <span className="text-xs font-bold text-indigo-600 w-10">{selectedElement.fontSize}px</span>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Alignment</label>
                  <div className="flex gap-2">
                    {['left', 'center', 'right'].map(a => (
                      <button key={a} onClick={() => updateElement(selectedId, { textAlign: a })}
                        className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors ${selectedElement.textAlign === a ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'}`}
                      >{a === 'left' ? '←' : a === 'center' ? '↔' : '→'}</button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateElement(selectedId, { fontWeight: selectedElement.fontWeight === 'bold' ? 'normal' : 'bold' })}
                    className={`flex-1 py-2 rounded-lg text-sm font-black border transition-colors ${selectedElement.fontWeight === 'bold' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-600'}`}
                  >B</button>
                  <button
                    onClick={() => updateElement(selectedId, { fontStyle: selectedElement.fontStyle === 'italic' ? 'normal' : 'italic' })}
                    className={`flex-1 py-2 rounded-lg text-sm italic font-bold border transition-colors ${selectedElement.fontStyle === 'italic' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-600'}`}
                  >I</button>
                  <button
                    onClick={() => updateElement(selectedId, { textTransform: selectedElement.textTransform === 'uppercase' ? 'none' : 'uppercase' })}
                    className={`flex-1 py-2 rounded-lg text-xs font-black border transition-colors ${selectedElement.textTransform === 'uppercase' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-600'}`}
                  >AA</button>
                </div>
              </div>
            )}

            {/* -------- STYLING -------- */}
            {editTab === 'style' && selectedElement && (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Fill Color</label>
                  <input
                    type="color"
                    value={selectedElement.type === 'text' ? selectedElement.color : selectedElement.backgroundColor}
                    onChange={(e) => updateElement(selectedId, selectedElement.type === 'text' ? { color: e.target.value } : { backgroundColor: e.target.value })}
                    className="w-full h-12 border-2 border-slate-200 rounded-xl cursor-pointer"
                  />
                </div>
                {selectedElement.type !== 'photo' && (
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Outline</label>
                    <div className="flex gap-2">
                      <input
                        type="color"
                        value={selectedElement.type === 'text' ? (selectedElement.textStrokeColor || '#000000') : (selectedElement.borderColor || '#ffffff')}
                        onChange={(e) => updateElement(selectedId, selectedElement.type === 'text' ? { textStrokeColor: e.target.value } : { borderColor: e.target.value })}
                        className="flex-1 h-10 border-2 border-slate-200 rounded-lg cursor-pointer"
                      />
                      <input
                        type="number" min="0"
                        value={selectedElement.type === 'text' ? (selectedElement.textStrokeWidth || 0) : (selectedElement.borderWidth || 0)}
                        onChange={(e) => updateElement(selectedId, selectedElement.type === 'text' ? { textStrokeWidth: Number(e.target.value) } : { borderWidth: Number(e.target.value) })}
                        className="w-16 border border-slate-200 p-2 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="px"
                      />
                    </div>
                  </div>
                )}
                {selectedElement.type !== 'text' && (
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Corner Radius</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="range" min="0" max={selectedElement.type === 'photo' ? 50 : 150}
                        value={selectedElement.borderRadius || 0}
                        onChange={(e) => updateElement(selectedId, { borderRadius: Number(e.target.value) })}
                        className="flex-1 accent-indigo-500"
                      />
                      <span className="text-xs font-bold text-indigo-600 w-12">{selectedElement.borderRadius || 0}px</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* -------- FILTERS -------- */}
            {editTab === 'filters' && selectedElement?.type === 'photo' && (
              <div className="space-y-4">
                {[
                  { label: 'Brightness', key: 'filterBrightness', min: 0, max: 200, def: 100, unit: '%' },
                  { label: 'Contrast', key: 'filterContrast', min: 0, max: 200, def: 100, unit: '%' },
                  { label: 'Saturation', key: 'filterSaturation', min: 0, max: 200, def: 100, unit: '%' },
                  { label: 'Blur', key: 'filterBlur', min: 0, max: 20, def: 0, unit: 'px' },
                ].map(({ label, key, min, max, def, unit }) => (
                  <div key={key}>
                    <div className="flex justify-between mb-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label>
                      <span className="text-xs font-bold text-indigo-600">{selectedElement[key] ?? def}{unit}</span>
                    </div>
                    <input
                      type="range" min={min} max={max}
                      value={selectedElement[key] ?? def}
                      onChange={(e) => updateElement(selectedId, { [key]: Number(e.target.value) })}
                      className="w-full accent-indigo-500"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* -------- EFFECTS -------- */}
            {editTab === 'effects' && selectedElement && (
              <div className="space-y-4">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-3 block">Drop Shadow</label>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Color</label>
                      <input type="color" value={selectedElement.shadowColor || '#000000'} onChange={(e) => updateElement(selectedId, { shadowColor: e.target.value })} className="w-full h-8 border border-slate-200 rounded cursor-pointer" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Blur</label>
                      <input type="number" min="0" value={selectedElement.shadowBlur || 0} onChange={(e) => updateElement(selectedId, { shadowBlur: Number(e.target.value) })} className="w-full border border-slate-200 p-1 rounded text-xs text-center font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Offset X</label>
                      <input type="number" value={selectedElement.shadowOffsetX || 0} onChange={(e) => updateElement(selectedId, { shadowOffsetX: Number(e.target.value) })} className="w-full border border-slate-200 p-1 rounded text-xs text-center font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Offset Y</label>
                      <input type="number" value={selectedElement.shadowOffsetY || 0} onChange={(e) => updateElement(selectedId, { shadowOffsetY: Number(e.target.value) })} className="w-full border border-slate-200 p-1 rounded text-xs text-center font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <label className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-2 block">Opacity</label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="range" min="0" max="1" step="0.05"
                      value={selectedElement.opacity ?? 1}
                      onChange={(e) => updateElement(selectedId, { opacity: parseFloat(e.target.value) })}
                      className="flex-1 accent-indigo-500"
                    />
                    <span className="text-xs font-bold text-indigo-600 w-10">{Math.round((selectedElement.opacity ?? 1) * 100)}%</span>
                  </div>
                </div>
              </div>
            )}

            {/* -------- ARRANGE -------- */}
            {editTab === 'arrange' && selectedElement && (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Rotation</label>
                  <div className="flex gap-2 items-center">
                    <input type="range" min="0" max="360" value={selectedElement.rotation || 0} onChange={(e) => updateElement(selectedId, { rotation: Number(e.target.value) })} className="flex-1 accent-indigo-500" />
                    <span className="text-xs font-bold text-indigo-600 w-10">{selectedElement.rotation || 0}°</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => moveLayerUp(selectedId)} className="flex-1 py-2 bg-indigo-100 border border-indigo-300 rounded-lg text-xs font-bold text-indigo-700 hover:bg-indigo-200 transition">↑ Forward</button>
                  <button onClick={() => moveLayerDown(selectedId)} className="flex-1 py-2 bg-indigo-100 border border-indigo-300 rounded-lg text-xs font-bold text-indigo-700 hover:bg-indigo-200 transition">↓ Back</button>
                </div>
                <button
                  onClick={duplicateElement}
                  className="w-full py-2 rounded-lg text-xs font-bold bg-slate-100 border border-slate-300 text-slate-700 hover:bg-slate-200 transition"
                >⧉ Duplicate Layer</button>
                <button
                  onClick={() => updateElement(selectedId, { isLocked: !selectedElement.isLocked })}
                  className={`w-full py-2 rounded-lg text-xs font-bold transition-colors ${selectedElement.isLocked ? 'bg-orange-100 border border-orange-300 text-orange-700' : 'bg-slate-100 border border-slate-300 text-slate-700'}`}
                >{selectedElement.isLocked ? '🔒 Locked (tap to unlock)' : '🔓 Unlocked (tap to lock)'}</button>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Position (raw px)</label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[9px] font-bold text-slate-400 block mb-1">X</label>
                      <input type="number" value={selectedElement.x} onChange={e => updateElement(selectedId, { x: Number(e.target.value) })} className="w-full border border-slate-200 p-1.5 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div className="flex-1">
                      <label className="text-[9px] font-bold text-slate-400 block mb-1">Y</label>
                      <input type="number" value={selectedElement.y} onChange={e => updateElement(selectedId, { y: Number(e.target.value) })} className="w-full border border-slate-200 p-1.5 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ==============================
          SELECTION TOOLS MODAL WAS REMOVED (NOW EMBEDDED)
      ============================== */}

      {/* ==============================
          EFFECTS EDITOR MODAL
      ============================== */}
      {showEffectsEditor && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 overflow-y-auto">
          <AdvancedImageEditor
            imageUrl={bgImage}
            selection={currentSelection}
            initialWidth={canvasWidth}
            initialHeight={canvasHeight}
            onImageUpdate={(newUrl) => {
              setBgImage(newUrl);
              setShowEffectsEditor(false);
            }}
            onClose={() => setShowEffectsEditor(false)}
          />
        </div>
      )}

      {/* ==============================
          PUBLISH MODAL
      ============================== */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black text-slate-800 mb-2">Publish Campaign</h3>
            <p className="text-slate-500 text-sm font-medium mb-6">
              You are about to publish <strong className="text-slate-700">"{campaignTitle}"</strong>.
            </p>

            {!bgImage && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-4 text-sm text-amber-800 font-medium">
                ⚠️ No background image set. The campaign will publish with a solid color background.
              </div>
            )}

            <div
              className={`border-2 rounded-2xl p-4 mb-6 cursor-pointer transition-all ${isPublic ? 'bg-indigo-50 border-indigo-500' : 'bg-slate-50 border-slate-200 hover:border-indigo-300'}`}
              onClick={() => setIsPublic(!isPublic)}
            >
              <div className="flex items-start gap-3">
                <input type="checkbox" checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} className="mt-1 w-5 h-5 accent-indigo-600 cursor-pointer shrink-0" />
                <div>
                  <p className={`font-black text-sm ${isPublic ? 'text-indigo-900' : 'text-slate-700'}`}>Feature on Homepage</p>
                  <p className={`text-xs mt-1 leading-relaxed ${isPublic ? 'text-indigo-700' : 'text-slate-500'}`}>
                    Allow your campaign to appear on the public homepage for maximum visibility.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowPublishModal(false)} className="flex-1 py-3 font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
              <button onClick={confirmPublish} disabled={isSaving} className="flex-[2] py-3 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50">
                {isSaving ? 'Publishing...' : 'Confirm & Publish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}