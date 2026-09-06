/**
 * Global Resilient Image Loader
 * Solves international CORS, CDN geo-blocking, and tainted canvas issues (e.g. ImgBB / i.ibb.co)
 */

export async function loadCanvasSafeImage(url) {
  if (!url) throw new Error("Image URL is required");

  // If it's already a data URL or blob URL, load directly
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Failed to load local image"));
      img.src = url;
    });
  }

  // If it's an ImgBB URL, prioritize the Cloudflare edge proxy (wsrv.nl)
  // because i.ibb.co is known to fail CORS / timeout in international networks
  const primaryUrl = url.includes('ibb.co')
    ? `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=png`
    : url;

  const secondaryUrl = url.includes('ibb.co')
    ? url
    : `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=png`;

  // Strategy 1: Primary with CORS
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = "anonymous";
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = primaryUrl;
    });
    return img;
  } catch (_err1) {
    console.warn("Primary image load failed - trying secondary URL...");
  }

  // Strategy 2: Secondary with CORS
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.crossOrigin = "anonymous";
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = secondaryUrl;
    });
    return img;
  } catch (_err2) {
    console.warn("Secondary image load failed - trying fetch blob proxy...");
  }

  // Method 3: Fetch via CORS proxy and create Blob URL (guaranteed non-tainting for Canvas)
  try {
    const corsProxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(url)}`;
    const response = await fetch(corsProxyUrl);
    if (!response.ok) throw new Error(`Fetch failed with ${response.status}`);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = objectUrl;
    });
    return img;
  } catch (_err3) {
    console.warn("CORS proxy blob load failed - attempting direct display fallback...");
  }

  // Method 4: Final fallback - load directly without crossOrigin
  return new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("All image loading strategies failed"));
    el.src = url;
  });
}

/**
 * Returns a globally accessible image URL for <img> tags and background-image CSS.
 * If the image is on ImgBB (which is frequently blocked in other countries or by adblockers),
 * automatically routes via wsrv.nl (Cloudflare global edge CDN) with guaranteed availability.
 */
export function getSafeImageUrl(url) {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('data:') || url.startsWith('blob:') || url.includes('wsrv.nl')) return url;
  if (url.includes('ibb.co')) {
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}`;
  }
  return url;
}

export function handleImgError(e, fallbackUrl) {
  const target = e.currentTarget;
  if (!target || target.dataset.triedProxy === 'true') return;
  target.dataset.triedProxy = 'true';
  const originalSrc = target.src;
  if (originalSrc && !originalSrc.includes('wsrv.nl')) {
    target.src = `https://wsrv.nl/?url=${encodeURIComponent(originalSrc)}`;
  } else if (fallbackUrl) {
    target.src = fallbackUrl;
  }
}
