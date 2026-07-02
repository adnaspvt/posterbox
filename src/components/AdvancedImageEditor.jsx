import { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';

/**
 * Advanced Image Editor with Selection-Based Effects
 * Allows users to apply effects only to selected areas of images
 */

export default function AdvancedImageEditor({
  imageUrl,
  onImageUpdate,
  onClose,
  initialWidth = 400,
  initialHeight = 400,
  selection = null
}) {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [selectedEffect, setSelectedEffect] = useState('none');
  const [effectIntensity, setEffectIntensity] = useState(50);
  const [isApplying, setIsApplying] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Load image on canvas
  useEffect(() => {
    if (!imageUrl) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = initialWidth;
      canvas.height = initialHeight;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      contextRef.current = ctx;
      setImageLoaded(true);
    };

    img.src = imageUrl;
  }, [imageUrl, initialWidth, initialHeight]);

  // Apply effect to selected area
  const applyEffectToSelection = async (effect, intensity) => {
    if (!selection || !canvasRef.current) {
      toast.error('Please make a selection first');
      return;
    }

    setIsApplying(true);

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const intensityFactor = intensity / 100;

      // Apply effect only to selected pixels
      selection.pixels.forEach(([x, y]) => {
        if (x >= 0 && x < canvas.width && y >= 0 && y < canvas.height) {
          const pixelIndex = (y * canvas.width + x) * 4;

          switch (effect) {
            case 'brightness':
              data[pixelIndex] = Math.min(255, data[pixelIndex] + 100 * intensityFactor);
              data[pixelIndex + 1] = Math.min(255, data[pixelIndex + 1] + 100 * intensityFactor);
              data[pixelIndex + 2] = Math.min(255, data[pixelIndex + 2] + 100 * intensityFactor);
              break;

            case 'darken':
              data[pixelIndex] = Math.max(0, data[pixelIndex] - 100 * intensityFactor);
              data[pixelIndex + 1] = Math.max(0, data[pixelIndex + 1] - 100 * intensityFactor);
              data[pixelIndex + 2] = Math.max(0, data[pixelIndex + 2] - 100 * intensityFactor);
              break;

            case 'saturate': {
              const r = data[pixelIndex];
              const g = data[pixelIndex + 1];
              const b = data[pixelIndex + 2];
              const gray = r * 0.299 + g * 0.587 + b * 0.114;
              const sat = 1 + intensityFactor;
              data[pixelIndex] = Math.min(255, Math.max(0, gray + (r - gray) * sat));
              data[pixelIndex + 1] = Math.min(255, Math.max(0, gray + (g - gray) * sat));
              data[pixelIndex + 2] = Math.min(255, Math.max(0, gray + (b - gray) * sat));
              break;
            }

            case 'grayscale': {
              const r = data[pixelIndex];
              const g = data[pixelIndex + 1];
              const b = data[pixelIndex + 2];
              const gray = r * 0.299 + g * 0.587 + b * 0.114;
              const amount = intensityFactor;
              data[pixelIndex] = Math.round(gray * amount + r * (1 - amount));
              data[pixelIndex + 1] = Math.round(gray * amount + g * (1 - amount));
              data[pixelIndex + 2] = Math.round(gray * amount + b * (1 - amount));
              break;
            }

            case 'blur':
              // Simple blur - add slight transparency
              data[pixelIndex + 3] = Math.max(0, data[pixelIndex + 3] - 50 * intensityFactor);
              break;

            case 'invert':
              data[pixelIndex] = 255 - data[pixelIndex];
              data[pixelIndex + 1] = 255 - data[pixelIndex + 1];
              data[pixelIndex + 2] = 255 - data[pixelIndex + 2];
              break;

            case 'sepia': {
              const r = data[pixelIndex];
              const g = data[pixelIndex + 1];
              const b = data[pixelIndex + 2];
              const amount = intensityFactor;
              const sepR = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
              const sepG = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
              const sepB = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
              data[pixelIndex] = Math.round(sepR * amount + r * (1 - amount));
              data[pixelIndex + 1] = Math.round(sepG * amount + g * (1 - amount));
              data[pixelIndex + 2] = Math.round(sepB * amount + b * (1 - amount));
              break;
            }

            case 'cool': {
              const r = data[pixelIndex];
              const g = data[pixelIndex + 1];
              const b = data[pixelIndex + 2];
              const amount = intensityFactor * 0.3;
              data[pixelIndex] = Math.max(0, r - amount * 30);
              data[pixelIndex + 1] = Math.min(255, g + amount * 20);
              data[pixelIndex + 2] = Math.min(255, b + amount * 50);
              break;
            }

            case 'warm': {
              const r = data[pixelIndex];
              const g = data[pixelIndex + 1];
              const b = data[pixelIndex + 2];
              const amount = intensityFactor * 0.3;
              data[pixelIndex] = Math.min(255, r + amount * 50);
              data[pixelIndex + 1] = Math.min(255, g + amount * 30);
              data[pixelIndex + 2] = Math.max(0, b - amount * 40);
              break;
            }

            default:
              break;
          }
        }
      });

      ctx.putImageData(imageData, 0, 0);
      onImageUpdate?.(canvas.toDataURL());
      toast.success(`Effect applied to selection`);
    } catch (error) {
      console.error('Error applying effect:', error);
      toast.error('Failed to apply effect');
    } finally {
      setIsApplying(false);
    }
  };

  const effects = [
    { id: 'brightness', label: '☀️ Brightness', desc: 'Make selection brighter' },
    { id: 'darken', label: '🌙 Darken', desc: 'Make selection darker' },
    { id: 'saturate', label: '🌈 Saturate', desc: 'Increase color intensity' },
    { id: 'grayscale', label: '⚫ Grayscale', desc: 'Convert to gray' },
    { id: 'sepia', label: '📸 Sepia', desc: 'Vintage sepia tone' },
    { id: 'invert', label: '🔄 Invert', desc: 'Invert colors' },
    { id: 'cool', label: '❄️ Cool', desc: 'Add cool blue tones' },
    { id: 'warm', label: '🔥 Warm', desc: 'Add warm orange tones' }
  ];

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 space-y-6 max-w-2xl">
      <div className="flex justify-between items-center border-b pb-4">
        <h2 className="text-xl font-bold text-slate-800">Advanced Image Effects</h2>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 text-2xl font-bold"
        >
          ×
        </button>
      </div>

      {/* CANVAS PREVIEW */}
      <div className="bg-slate-100 rounded-lg p-4 flex justify-center">
        <canvas
          ref={canvasRef}
          width={initialWidth}
          height={initialHeight}
          className="max-w-full border-2 border-slate-300 rounded"
        />
      </div>

      {/* SELECTION INFO */}
      {selection && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm font-bold text-blue-900">
            ✓ Selection active: {selection.pixels.length.toLocaleString()} pixels
          </p>
        </div>
      )}

      {/* EFFECT SELECTION */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Effects</label>
        <div className="grid grid-cols-2 gap-2">
          {effects.map(effect => (
            <button
              key={effect.id}
              onClick={() => setSelectedEffect(effect.id)}
              className={`py-3 px-3 rounded-lg text-sm font-bold transition-all text-left ${
                selectedEffect === effect.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
              title={effect.desc}
            >
              <div>{effect.label}</div>
              <div className="text-xs opacity-70">{effect.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* INTENSITY SLIDER */}
      {selectedEffect !== 'none' && (
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Intensity: {effectIntensity}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={effectIntensity}
            onChange={(e) => setEffectIntensity(Number(e.target.value))}
            className="w-full"
          />
        </div>
      )}

      {/* ACTION BUTTONS */}
      <div className="flex gap-2">
        <button
          onClick={() => applyEffectToSelection(selectedEffect, effectIntensity)}
          disabled={!selection || selectedEffect === 'none' || isApplying}
          className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all"
        >
          {isApplying ? '⏳ Applying...' : '✓ Apply Effect'}
        </button>
        <button
          onClick={onClose}
          className="flex-1 py-3 bg-slate-200 text-slate-700 font-bold rounded-lg hover:bg-slate-300 transition-all"
        >
          Close
        </button>
      </div>

      {/* INSTRUCTIONS */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <p className="text-xs text-amber-900 font-semibold">📌 How to use:</p>
        <ol className="text-xs text-amber-800 mt-2 space-y-1 list-decimal list-inside">
          <li>Use Selection Tools to select an area</li>
          <li>Choose an effect from the list</li>
          <li>Adjust intensity with the slider</li>
          <li>Click "Apply Effect" to apply changes</li>
        </ol>
      </div>
    </div>
  );
}
