import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db } from '../config/firebase';
import toast from 'react-hot-toast';
import ReactCrop, { centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

function Generator() {
  const [searchParams] = useSearchParams();
  const campaignId = searchParams.get('id');

  const [campaign, setCampaign] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- CANVAS & INPUT STATE ---
  const canvasRef = useRef(null);
  const [bgObj, setBgObj] = useState(null);
  const [inputs, setInputs] = useState({});
  const [photos, setPhotos] = useState({});
  const [maskObjs, setMaskObjs] = useState({});

  // --- CROP STATE ---
  const imgRef = useRef(null);
  const [cropEl, setCropEl] = useState(null);
  const [imgSrc, setImgSrc] = useState(null);
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState();

  // ==========================================
  // FETCH CAMPAIGN & RECORD VIEW
  // ==========================================
  useEffect(() => {
    if (!campaignId) { setTimeout(() => { setError("Invalid campaign link."); setIsLoading(false); }, 0); return; }

    const fetchCampaign = async () => {
      try {
        const docRef = doc(db, "campaigns", campaignId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setCampaign(data);

          updateDoc(docRef, { views: increment(1) }).catch(() => { });

          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = data.backgroundImage;
          img.onload = async () => {
            setBgObj(img);

            // Load masks if any
            const newMasks = {};
            if (data.elements) {
              const maskPromises = data.elements
                .filter(el => el.maskImage)
                .map(el => new Promise((resolve) => {
                  const mImg = new Image();
                  mImg.src = el.maskImage;
                  mImg.onload = () => { newMasks[el.id] = mImg; resolve(); };
                  mImg.onerror = () => resolve();
                }));
              await Promise.all(maskPromises);
            }
            setMaskObjs(newMasks);
            setIsLoading(false);
          };
          img.onerror = () => { setError("Failed to load campaign artwork."); setIsLoading(false); };
        } else {
          setError("Campaign not found or has been removed.");
          setIsLoading(false);
        }
      } catch (error) {
        console.error(error);
        setError("Error loading campaign.");
        setIsLoading(false);
      }
    };
    fetchCampaign();
  }, [campaignId]);

  // ==========================================
  // PHOTO CROPPING LOGIC
  // ==========================================
  const dynamicAspect = cropEl ? cropEl.width / cropEl.height : 1;

  const onImgLoad = (e) => {
    if (dynamicAspect) {
      const { width, height } = e.currentTarget;
      const initialCrop = centerCrop(makeAspectCrop({ unit: '%', width: 90 }, dynamicAspect, width, height), width, height);
      setCrop(initialCrop); setCompletedCrop(initialCrop);
    }
  };

  const finishCrop = async () => {
    if (!completedCrop || !imgRef.current || !cropEl) return;
    const image = imgRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, completedCrop.x * scaleX, completedCrop.y * scaleY, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const img = new Image();
      img.onload = () => {
        setPhotos(prev => ({ ...prev, [cropEl.id]: img }));
        setCropEl(null); setImgSrc(null); setCrop(undefined); setCompletedCrop(undefined);
      };
      img.src = URL.createObjectURL(blob);
    }, 'image/jpeg', 1.0);
  };

  // ==========================================
  // THE HTML5 CANVAS RENDER ENGINE
  // ==========================================
  useEffect(() => {
    if (!campaign || !bgObj || !canvasRef.current) return;

    // 🚀 NEW: The Font Race Condition Lock!
    // This forces the Canvas to wait until Google Fonts are fully loaded before drawing.
    document.fonts.ready.then(() => {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { alpha: false });

      // Elements are saved in native resolution by ProEditor (campaign.canvasWidth).
      // Since this canvas is also sized to campaign.canvasWidth, the SCALE is 1.0.
      const SCALE = canvas.width / (campaign.canvasWidth || 800);

      const sortedElements = [...(campaign.elements || [])].sort((a, b) => (a.zIndex || 1) - (b.zIndex || 1));

      const drawList = [
        ...sortedElements.filter(el => el.isBackgroundLayer),
        { type: '__BACKGROUND_IMAGE__' },
        ...sortedElements.filter(el => !el.isBackgroundLayer)
      ];

      drawList.forEach(el => {
        if (el.type === '__BACKGROUND_IMAGE__') {
          if (bgObj) ctx.drawImage(bgObj, 0, 0, canvas.width, canvas.height);
          return;
        }

        ctx.save();
        ctx.globalAlpha = el.opacity ?? 1;
        ctx.globalCompositeOperation = (el.mixBlendMode && el.mixBlendMode !== 'normal') ? el.mixBlendMode : 'source-over';

        if (el.shadowColor && el.shadowColor !== 'transparent') {
          ctx.shadowColor = el.shadowColor;
          ctx.shadowBlur = (el.shadowBlur || 0) * SCALE;
          ctx.shadowOffsetX = (el.shadowOffsetX || 0) * SCALE;
          ctx.shadowOffsetY = (el.shadowOffsetY || 0) * SCALE;
        }

        if (el.type === 'shape') {
          ctx.beginPath();
          ctx.roundRect(el.x * SCALE, el.y * SCALE, el.width * SCALE, el.height * SCALE, (el.borderRadius || 0) * SCALE);
          if (el.backgroundColor && el.backgroundColor !== 'transparent') { ctx.fillStyle = el.backgroundColor; ctx.fill(); }
          if (el.borderWidth > 0) { ctx.strokeStyle = el.borderColor || '#ffffff'; ctx.lineWidth = el.borderWidth * SCALE; ctx.stroke(); }
        }
        else if (el.type === 'photo') {
          ctx.save();
          if (maskObjs[el.id]) {
            // Create an offscreen canvas to avoid clearing the main canvas with source-in
            const offCanvas = document.createElement('canvas');
            offCanvas.width = canvas.width;
            offCanvas.height = canvas.height;
            const offCtx = offCanvas.getContext('2d');

            // 1. Draw the user photo OR the background color placeholder first
            if (photos[el.id]) {
              offCtx.filter = `brightness(${el.filterBrightness ?? 100}%) contrast(${el.filterContrast ?? 100}%) saturate(${el.filterSaturation ?? 100}%) blur(${(el.filterBlur || 0) * SCALE}px)`;
              offCtx.drawImage(photos[el.id], el.x * SCALE, el.y * SCALE, el.width * SCALE, el.height * SCALE);
              offCtx.filter = 'none';
            } else {
              offCtx.fillStyle = el.backgroundColor || "#e2e8f0";
              offCtx.fillRect(el.x * SCALE, el.y * SCALE, el.width * SCALE, el.height * SCALE);

              // Draw placeholder icon/text on canvas so user knows it's an upload area
              offCtx.fillStyle = 'rgba(0,0,0,0.3)';
              offCtx.textAlign = 'center';
              offCtx.textBaseline = 'middle';
              offCtx.font = `bold ${24 * SCALE}px sans-serif`;
              offCtx.fillText('📷', (el.x + el.width / 2) * SCALE, (el.y + el.height / 2) * SCALE);
            }

            // 2. Use destination-in to clip everything drawn so far to the exact shape of the mask
            offCtx.globalCompositeOperation = 'destination-in';
            offCtx.drawImage(maskObjs[el.id], el.x * SCALE, el.y * SCALE, el.width * SCALE, el.height * SCALE);

            // 3. Now draw the perfectly masked offscreen canvas onto the main canvas
            ctx.drawImage(offCanvas, 0, 0);
          } else {
            // Standard rounded rectangle clip
            ctx.beginPath();
            ctx.roundRect(el.x * SCALE, el.y * SCALE, el.width * SCALE, el.height * SCALE, (el.borderRadius || 0) * SCALE);

            ctx.fillStyle = el.backgroundColor || "#e2e8f0";
            ctx.fill();

            ctx.fillStyle = 'rgba(0,0,0,0.3)';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.font = `bold ${24 * SCALE}px sans-serif`;
            ctx.fillText('📷', (el.x + el.width / 2) * SCALE, (el.y + el.height / 2) * SCALE);

            ctx.save();
            ctx.clip();
            ctx.filter = `brightness(${el.filterBrightness ?? 100}%) contrast(${el.filterContrast ?? 100}%) saturate(${el.filterSaturation ?? 100}%) blur(${(el.filterBlur || 0) * SCALE}px)`;

            if (photos[el.id]) {
              ctx.drawImage(photos[el.id], el.x * SCALE, el.y * SCALE, el.width * SCALE, el.height * SCALE);
            }
            ctx.restore();

            ctx.filter = 'none';
            if (el.borderWidth > 0) { ctx.strokeStyle = el.borderColor || '#ffffff'; ctx.lineWidth = el.borderWidth * SCALE; ctx.stroke(); }
          }
          ctx.restore();
        }
        else if (el.type === 'text') {
          let textToDraw = inputs[el.id] !== undefined && inputs[el.id] !== '' ? inputs[el.id] : el.text;
          if (el.textTransform === 'uppercase') textToDraw = textToDraw.toUpperCase();

          let targetCtx = ctx;
          let offCanvas = null;
          if (maskObjs[el.id]) {
            offCanvas = document.createElement('canvas');
            offCanvas.width = canvas.width;
            offCanvas.height = canvas.height;
            targetCtx = offCanvas.getContext('2d');
          }

          targetCtx.fillStyle = el.color || '#ffffff';
          targetCtx.textBaseline = "middle";
          if (targetCtx.letterSpacing !== undefined) targetCtx.letterSpacing = `${(el.letterSpacing || 0) * SCALE}px`;

          // Smart Font Auto-Scaler & Wrapper
          let currentFontSize = (el.fontSize || 36) * SCALE;
          const minFontSize = 10 * SCALE;
          const maxLineWidth = el.width * SCALE;
          const maxLineHeight = el.height * SCALE;
          let wrappedLines = [];
          let lineHeightPx = 0;

          while (currentFontSize >= minFontSize) {
            targetCtx.font = `${el.fontStyle || 'normal'} ${el.fontWeight || 'bold'} ${currentFontSize}px ${el.fontFamily || 'Arial, sans-serif'}`;
            const rawLines = textToDraw.split('\n');
            wrappedLines = [];

            rawLines.forEach(rawLine => {
              const words = rawLine.split(' ');
              let currentLine = words[0] || '';

              for (let i = 1; i < words.length; i++) {
                const word = words[i];
                const testLine = currentLine + " " + word;
                if (targetCtx.measureText(testLine).width > maxLineWidth) {
                  wrappedLines.push(currentLine);
                  currentLine = word;
                } else {
                  currentLine = testLine;
                }
              }
              wrappedLines.push(currentLine);
            });

            lineHeightPx = currentFontSize * (el.lineHeight || 1.2);
            const totalTextHeight = wrappedLines.length * lineHeightPx;

            if (totalTextHeight <= maxLineHeight) break;
            currentFontSize -= 2;
          }

          const finalTotalHeight = wrappedLines.length * lineHeightPx;
          const startY = (el.y * SCALE) + ((el.height * SCALE) / 2) - (finalTotalHeight / 2) + (lineHeightPx / 2);

          wrappedLines.forEach((line, idx) => {
            let drawX;
            if (el.textAlign === 'left') { drawX = el.x * SCALE; targetCtx.textAlign = "left"; }
            else if (el.textAlign === 'right') { drawX = (el.x + el.width) * SCALE; targetCtx.textAlign = "right"; }
            else { drawX = (el.x * SCALE) + ((el.width * SCALE) / 2); targetCtx.textAlign = "center"; }

            const currentY = startY + (idx * lineHeightPx);

            if (el.textStrokeWidth > 0) {
              targetCtx.lineWidth = (el.textStrokeWidth * SCALE) * 2;
              targetCtx.strokeStyle = el.textStrokeColor || '#000000';
              targetCtx.strokeText(line, drawX, currentY);
            }
            targetCtx.fillText(line, drawX, currentY);
          });

          if (maskObjs[el.id]) {
            targetCtx.globalCompositeOperation = 'destination-in';
            targetCtx.drawImage(maskObjs[el.id], el.x * SCALE, el.y * SCALE, el.width * SCALE, el.height * SCALE);
            ctx.drawImage(offCanvas, 0, 0);
          }
        }
        ctx.restore();
      });

      // Draw Watermark if not premium
      if (!campaign.isPremium) {
        ctx.save();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        const SCALE = 2; // Fixed scale for internal logic
        ctx.font = `bold ${16 * SCALE}px sans-serif`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 6 * SCALE;
        ctx.fillText('Made with CampSend ✨', canvas.width - (16 * SCALE), canvas.height - (16 * SCALE));
        ctx.restore();
      }

    });
  }, [campaign, bgObj, inputs, photos, maskObjs]);

  // ==========================================
  // DOWNLOAD ACTION
  // ==========================================
  const handleDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `${campaign.title.replace(/\s+/g, '_')}_Generated.jpg`;
    link.href = canvas.toDataURL("image/jpeg", 1.0);
    link.click();
    toast.success("Poster Downloaded!");

    try { await updateDoc(doc(db, "campaigns", campaignId), { postersGenerated: increment(1) }); } catch (error) { console.error(error); }
  };

  // ==========================================
  // 🚀 VIRAL SOCIAL SHARING ENGINE
  // ==========================================
  const handleShare = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const campaignUrl = `${window.location.origin}/generator?id=${campaignId}`;
    const viralMessage = `I just made this awesome poster for ${campaign.title}! ✨\n\nCreate your own here in 10 seconds: ${campaignUrl}`;

    try {
      // Step 1: Attempt Native File Sharing (Mobile Devices)
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const file = new File([blob], 'my_poster.jpg', { type: 'image/jpeg' });

        const shareData = {
          title: campaign.title,
          text: viralMessage,
          files: [file] // Attaches the actual image to WhatsApp/Insta!
        };

        if (navigator.canShare && navigator.canShare(shareData)) {
          await navigator.share(shareData);
          toast.success("Thanks for sharing!");
          // Log stat
          try { await updateDoc(doc(db, "campaigns", campaignId), { postersGenerated: increment(1) }); } catch (error) { console.error(error); }
        } else {
          // Step 2: Fallback for Desktop (Downloads image + opens WhatsApp Web)
          handleDownload();
          const waUrl = `https://wa.me/?text=${encodeURIComponent(viralMessage + "\n\n(Attach the image that just downloaded!)")}`;
          window.open(waUrl, '_blank');
        }
      }, 'image/jpeg', 1.0);

    } catch (error) {
      console.log("Share error:", error);
    }
  };

  // ==========================================
  // UI RENDERING
  // ==========================================
  if (isLoading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-indigo-600 font-bold text-xl animate-pulse">Loading Campaign...</div>;
  if (error) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-red-500 font-bold text-xl flex-col gap-4"><span>⚠️</span> {error}</div>;

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col font-sans">

      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 py-4 px-6 flex justify-between items-center shadow-sm z-10 relative">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <span className="text-white font-black text-lg leading-none">C</span>
          </div>
          <div className="text-xl font-black text-slate-800 tracking-tight">Camp<span className="text-indigo-600">Send</span></div>
        </div>
        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1.5 rounded-lg">Public Generator</div>
      </header>

      {/* MAIN GENERATOR LAYOUT */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">

        {/* LEFT: LIVE CANVAS PREVIEW */}
        <div className="flex-[1.5] bg-slate-100 p-6 lg:p-12 flex flex-col items-center justify-center overflow-auto relative">
          <div className="absolute inset-0 opacity-5 bg-[radial-gradient(#4f46e5_1px,transparent_1px)] bg-size-[20px_20px]"></div>

          <div className="w-full max-w-md shadow-[0_20px_50px_rgba(0,0,0,0.15)] rounded-lg overflow-hidden bg-white relative z-10 border border-slate-200" style={{ aspectRatio: `${campaign.canvasWidth || 800} / ${campaign.canvasHeight || 1066}` }}>
            <canvas ref={canvasRef} width={campaign.canvasWidth || 800} height={campaign.canvasHeight || 1066} className="w-full h-full object-cover" />
          </div>
        </div>

        {/* RIGHT: USER INPUT FORM */}
        <div className="w-full lg:w-112.5 bg-white border-t lg:border-t-0 lg:border-l border-slate-200 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] lg:shadow-none flex flex-col z-20 h-auto lg:h-full shrink-0 relative">

          <div className="p-6 md:p-8 flex-1 overflow-y-auto custom-scrollbar">
            <h1 className="text-2xl font-black text-slate-800 mb-2 leading-tight">{campaign.title}</h1>
            <p className="text-sm font-medium text-slate-500 mb-8">Fill in the fields below to customize your poster. The preview will update instantly.</p>

            <div className="flex flex-col gap-6">
              {[...(campaign.elements || [])].filter(el => el.type !== 'shape').sort((a, b) => a.y - b.y).map((el, i) => (
                <div key={el.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-100 transition-all focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-200">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <span className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded flex items-center justify-center text-[10px]">{i + 1}</span>
                    {el.type === 'text' ? 'Your Text' : 'Your Photo'}
                  </label>

                  {el.type === 'text' ? (
                    <input type="text" placeholder={el.text} value={inputs[el.id] || ''} onChange={(e) => setInputs({ ...inputs, [el.id]: e.target.value })} className="w-full p-4 bg-white border border-slate-200 rounded-xl font-bold text-slate-800 focus:outline-none shadow-sm transition-shadow" />
                  ) : (
                    <button onClick={() => document.getElementById(`file-${el.id}`).click()} className={`w-full p-4 bg-white border ${photos[el.id] ? 'border-emerald-200 text-emerald-600' : 'border-slate-200 text-indigo-600 hover:border-indigo-200'} rounded-xl font-bold transition-colors shadow-sm flex items-center justify-center gap-2`}>
                      <span>{photos[el.id] ? '✅' : '📸'}</span> {photos[el.id] ? 'Photo Attached (Tap to Change)' : 'Upload Your Photo'}
                      <input id={`file-${el.id}`} type="file" accept="image/*" onChange={(e) => { if (e.target.files[0]) { setCropEl(el); setImgSrc(URL.createObjectURL(e.target.files[0])); } }} className="hidden" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* VIRAL SHARE & DOWNLOAD AREA */}
          <div className="p-6 bg-slate-50 border-t border-slate-200 shrink-0 flex flex-col gap-3">

            <button onClick={handleShare} className="w-full py-4 bg-linear-to-r from-[#25D366] to-[#128C7E] text-white font-black text-lg rounded-xl shadow-[0_8px_20px_-4px_rgba(37,211,102,0.4)] hover:-translate-y-0.5 active:scale-95 transition-all flex items-center justify-center gap-3">
              <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 00-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" /></svg>
              Share to WhatsApp
            </button>

            <button onClick={handleDownload} className="w-full py-4 bg-white border border-slate-300 text-slate-700 font-bold text-md rounded-xl hover:bg-slate-100 transition-all flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              Just Download Image
            </button>

            <p className="text-center text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">Powered by CampSend</p>
          </div>
        </div>
      </div>

      {/* ========================================== */}
      {/* PHOTO CROP MODAL                             */}
      {/* ========================================== */}
      {imgSrc && cropEl && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center z-60 p-4">
          <div className="bg-white p-5 md:p-8 rounded-4xl shadow-2xl w-full max-w-lg flex flex-col h-[85vh] md:h-auto overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Frame Photo</h3>
              <button onClick={() => { setCropEl(null); setImgSrc(null); }} className="w-10 h-10 bg-slate-50 hover:bg-red-50 hover:text-red-500 text-slate-500 rounded-full flex items-center justify-center font-bold text-xl transition-colors">✕</button>
            </div>

            <div className="flex-1 bg-slate-100 rounded-2xl overflow-hidden relative flex items-center justify-center p-2 mb-6 border border-slate-200 shadow-inner">
              <ReactCrop crop={crop} onChange={c => setCrop(c)} onComplete={c => setCompletedCrop(c)} aspect={dynamicAspect}>
                <img ref={imgRef} src={imgSrc} onLoad={onImgLoad} className="max-h-[50vh] object-contain rounded" alt="Crop Target" />
              </ReactCrop>
            </div>

            <div className="flex gap-3">
              <button onClick={() => { setCropEl(null); setImgSrc(null); }} className="flex-1 py-4 border border-slate-200 bg-white text-slate-600 rounded-xl font-bold shadow-sm hover:bg-slate-50 transition-colors">Cancel</button>
              <button onClick={finishCrop} disabled={!completedCrop} className="flex-2 py-4 bg-indigo-600 text-white rounded-xl font-bold shadow-[0_8px_20px_-4px_rgba(79,70,229,0.4)] disabled:opacity-50 active:scale-95 transition-all">Apply Crop</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Generator;
