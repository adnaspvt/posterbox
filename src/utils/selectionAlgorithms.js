/**
 * Selection Algorithms for Image Editing
 * Includes: Magic Wand, Brush, Rectangle, Circle, Lasso, and Auto Edge Detection
 */

// =====================================================
// MAGIC WAND / FLOOD FILL SELECTION
// =====================================================
export const magicWandSelection = (imageData, x, y, tolerance = 30) => {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;

  const startX = Math.max(0, Math.min(width - 1, Math.floor(x)));
  const startY = Math.max(0, Math.min(height - 1, Math.floor(y)));

  const startIdx = (startY * width + startX) * 4;
  const tr = data[startIdx];
  const tg = data[startIdx + 1];
  const tb = data[startIdx + 2];

  // Compare squared color distance for speed and precision
  const tolSq = tolerance * tolerance * 3;

  const visited = new Uint8Array(width * height);
  const selectedPixels = [];

  // High-performance typed array queue for O(1) operations
  const maxPixels = width * height;
  const queueX = new Int32Array(maxPixels);
  const queueY = new Int32Array(maxPixels);
  let head = 0;
  let tail = 0;

  queueX[tail] = startX;
  queueY[tail] = startY;
  tail++;
  visited[startY * width + startX] = 1;

  let minX = startX, maxX = startX, minY = startY, maxY = startY;

  while (head < tail) {
    const px = queueX[head];
    const py = queueY[head];
    head++;

    selectedPixels.push([px, py]);
    if (px < minX) minX = px;
    if (px > maxX) maxX = px;
    if (py < minY) minY = py;
    if (py > maxY) maxY = py;

    const neighbors = [
      [px + 1, py],
      [px - 1, py],
      [px, py + 1],
      [px, py - 1]
    ];

    for (let i = 0; i < 4; i++) {
      const nx = neighbors[i][0];
      const ny = neighbors[i][1];

      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nIdx = ny * width + nx;
        if (!visited[nIdx]) {
          visited[nIdx] = 1;
          const pIdx = nIdx * 4;
          const dr = data[pIdx] - tr;
          const dg = data[pIdx + 1] - tg;
          const db = data[pIdx + 2] - tb;
          const distSq = dr * dr + dg * dg + db * db;

          if (distSq <= tolSq) {
            queueX[tail] = nx;
            queueY[tail] = ny;
            tail++;
          }
        }
      }
    }
  }

  return {
    pixels: selectedPixels,
    type: 'magicWand',
    tolerance,
    centerX: x,
    centerY: y,
    bounds: { x: minX, y: minY, width: Math.max(1, maxX - minX + 1), height: Math.max(1, maxY - minY + 1) }
  };
};

// =====================================================
// BRUSH SELECTION (Freehand drawing)
// =====================================================
export const brushSelection = (points, brushSize = 5) => {
  const selectedPixels = [];
  const brushRadius = brushSize / 2;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (let i = 0; i < points.length; i++) {
    const [x, y] = points[i];

    for (let dx = -brushRadius; dx <= brushRadius; dx++) {
      for (let dy = -brushRadius; dy <= brushRadius; dy++) {
        if (dx * dx + dy * dy <= brushRadius * brushRadius) {
          const px = Math.floor(x + dx);
          const py = Math.floor(y + dy);
          selectedPixels.push([px, py]);
          if (px < minX) minX = px;
          if (px > maxX) maxX = px;
          if (py < minY) minY = py;
          if (py > maxY) maxY = py;
        }
      }
    }

    if (i > 0) {
      const [px, py] = points[i - 1];
      const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
      const steps = Math.ceil(dist);
      for (let step = 1; step < steps; step++) {
        const t = step / steps;
        const ix = Math.floor(px + (x - px) * t);
        const iy = Math.floor(py + (y - py) * t);
        for (let dx = -brushRadius; dx <= brushRadius; dx++) {
          for (let dy = -brushRadius; dy <= brushRadius; dy++) {
            if (dx * dx + dy * dy <= brushRadius * brushRadius) {
              const nx = ix + dx;
              const ny = iy + dy;
              selectedPixels.push([nx, ny]);
              if (nx < minX) minX = nx;
              if (nx > maxX) maxX = nx;
              if (ny < minY) minY = ny;
              if (ny > maxY) maxY = ny;
            }
          }
        }
      }
    }
  }

  return {
    pixels: [...new Set(selectedPixels.map(p => p.join(',')).values())].map(p => p.split(',').map(Number)),
    type: 'brush',
    brushSize,
    points,
    bounds: { x: minX, y: minY, width: Math.max(1, maxX - minX + 1), height: Math.max(1, maxY - minY + 1) }
  };
};

// =====================================================
// RECTANGLE SELECTION
// =====================================================
export const rectangleSelection = (x1, y1, x2, y2) => {
  const selectedPixels = [];
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);

  for (let y = Math.floor(minY); y <= Math.floor(maxY); y++) {
    for (let x = Math.floor(minX); x <= Math.floor(maxX); x++) {
      selectedPixels.push([x, y]);
    }
  }

  return {
    pixels: selectedPixels,
    type: 'rectangle',
    bounds: { x: Math.floor(minX), y: Math.floor(minY), width: Math.max(1, Math.floor(maxX - minX)), height: Math.max(1, Math.floor(maxY - minY)) }
  };
};

// =====================================================
// CIRCLE/ELLIPSE SELECTION
// =====================================================
export const circleSelection = (centerX, centerY, radiusX, radiusY = radiusX) => {
  const selectedPixels = [];

  for (let y = Math.floor(centerY - radiusY); y <= Math.floor(centerY + radiusY); y++) {
    for (let x = Math.floor(centerX - radiusX); x <= Math.floor(centerX + radiusX); x++) {
      const dx = (x - centerX) / (radiusX || 1);
      const dy = (y - centerY) / (radiusY || 1);
      if (dx * dx + dy * dy <= 1) {
        selectedPixels.push([x, y]);
      }
    }
  }

  return {
    pixels: selectedPixels,
    type: 'circle',
    centerX,
    centerY,
    radiusX,
    radiusY,
    bounds: {
      x: Math.floor(centerX - radiusX),
      y: Math.floor(centerY - radiusY),
      width: Math.max(1, Math.floor(radiusX * 2)),
      height: Math.max(1, Math.floor(radiusY * 2))
    }
  };
};

// =====================================================
// LASSO SELECTION (Free polygon)
// =====================================================
export const lassoSelection = (points) => {
  if (!points || points.length < 3) {
    return { pixels: [], type: 'lasso', points, bounds: { x: 0, y: 0, width: 0, height: 0 } };
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < points.length; i++) {
    const px = points[i][0];
    const py = points[i][1];
    if (px < minX) minX = px;
    if (px > maxX) maxX = px;
    if (py < minY) minY = py;
    if (py > maxY) maxY = py;
  }

  const floorMinX = Math.floor(minX);
  const floorMinY = Math.floor(minY);
  const ceilMaxX = Math.ceil(maxX);
  const ceilMaxY = Math.ceil(maxY);

  const w = Math.max(1, ceilMaxX - floorMinX + 1);
  const h = Math.max(1, ceilMaxY - floorMinY + 1);

  // Rasterize polygon using fast offscreen canvas fill for sub-pixel accuracy
  const offCanvas = document.createElement('canvas');
  offCanvas.width = w;
  offCanvas.height = h;
  const ctx = offCanvas.getContext('2d', { willReadFrequently: true });

  ctx.beginPath();
  ctx.moveTo(points[0][0] - floorMinX, points[0][1] - floorMinY);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i][0] - floorMinX, points[i][1] - floorMinY);
  }
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const selectedPixels = [];

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 128) {
        selectedPixels.push([floorMinX + x, floorMinY + y]);
      }
    }
  }

  return {
    pixels: selectedPixels,
    type: 'lasso',
    points,
    bounds: { x: floorMinX, y: floorMinY, width: w, height: h }
  };
};

// =====================================================
// AUTOMATIC EDGE DETECTION & AREA FINDING
// =====================================================
export const autoDetectAreas = (imageData, edgeThreshold = 50, minAreaSize = 100) => {
  const edges = detectEdges(imageData, edgeThreshold);
  const areas = findContiguousAreas(edges, imageData.width, imageData.height);
  
  return areas.filter(area => area.pixels.length >= minAreaSize);
};

const detectEdges = (imageData, threshold) => {
  const data = imageData.data;
  const width = imageData.width;
  const height = imageData.height;
  const edges = new Uint8ClampedArray(width * height);
  
  // Sobel edge detection
  const sobelX = [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]];
  const sobelY = [[-1, -2, -1], [0, 0, 0], [1, 2, 1]];
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let gx = 0, gy = 0;
      
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          const gray = data[idx] * 0.299 + data[idx + 1] * 0.587 + data[idx + 2] * 0.114;
          gx += gray * sobelX[ky + 1][kx + 1];
          gy += gray * sobelY[ky + 1][kx + 1];
        }
      }
      
      const magnitude = Math.sqrt(gx * gx + gy * gy);
      edges[y * width + x] = magnitude > threshold ? 255 : 0;
    }
  }
  
  return edges;
};

const findContiguousAreas = (edges, width, height) => {
  const visited = new Set();
  const areas = [];
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const key = `${x},${y}`;
      if (edges[y * width + x] > 0 && !visited.has(key)) {
        const area = floodFillArea(edges, x, y, width, height, visited);
        areas.push(area);
      }
    }
  }
  
  return areas;
};

const floodFillArea = (edges, startX, startY, width, height, visited) => {
  const queue = [[startX, startY]];
  const pixels = [];
  let minX = startX, maxX = startX, minY = startY, maxY = startY;
  
  while (queue.length > 0) {
    const [x, y] = queue.shift();
    const key = `${x},${y}`;
    
    if (visited.has(key) || x < 0 || x >= width || y < 0 || y >= height) continue;
    if (edges[y * width + x] === 0) continue;
    
    visited.add(key);
    pixels.push([x, y]);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    
    queue.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }
  
  return {
    pixels,
    bounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
    area: pixels.length
  };
};

// =====================================================
// SELECTION MASK GENERATION
// =====================================================
export const generateSelectionMask = (selection, width, height) => {
  const mask = new Uint8ClampedArray(width * height);
  
  selection.pixels.forEach(([x, y]) => {
    if (x >= 0 && x < width && y >= 0 && y < height) {
      mask[y * width + x] = 255;
    }
  });
  
  return mask;
};

// =====================================================
// APPLY SELECTION TO IMAGE
// =====================================================
export const applySelectionEffect = (imageData, mask, effect = 'highlight') => {
  const data = imageData.data;
  
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] > 0) {
      const pixelIndex = i * 4;
      if (effect === 'highlight') {
        data[pixelIndex] = Math.min(255, data[pixelIndex] + 60);
        data[pixelIndex + 1] = Math.min(255, data[pixelIndex + 1] + 60);
        data[pixelIndex + 2] = Math.min(255, data[pixelIndex + 2] + 60);
      } else if (effect === 'dim') {
        data[pixelIndex] = Math.floor(data[pixelIndex] * 0.6);
        data[pixelIndex + 1] = Math.floor(data[pixelIndex + 1] * 0.6);
        data[pixelIndex + 2] = Math.floor(data[pixelIndex + 2] * 0.6);
      } else if (effect === 'blur') {
        data[pixelIndex + 3] = 180; // Reduce opacity for blur effect
      }
    }
  }
  
  return imageData;
};

// =====================================================
// UTILITY FUNCTIONS
// =====================================================
export const combineSelections = (selection1, selection2, mode = 'add') => {
  const pixelSet1 = new Set(selection1.pixels.map(p => p.join(',')));
  const pixelSet2 = new Set(selection2.pixels.map(p => p.join(',')));
  
  let combined;
  if (mode === 'add') {
    combined = new Set([...pixelSet1, ...pixelSet2]);
  } else if (mode === 'subtract') {
    combined = new Set([...pixelSet1].filter(p => !pixelSet2.has(p)));
  } else if (mode === 'intersect') {
    combined = new Set([...pixelSet1].filter(p => pixelSet2.has(p)));
  }
  
  return {
    pixels: Array.from(combined).map(p => p.split(',').map(Number)),
    type: 'combined',
    mode,
    sources: [selection1.type, selection2.type]
  };
};

export const invertSelection = (selection, width, height) => {
  const selectedSet = new Set(selection.pixels.map(p => p.join(',')));
  const inverted = [];
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!selectedSet.has(`${x},${y}`)) {
        inverted.push([x, y]);
      }
    }
  }
  
  return { pixels: inverted, type: 'inverted', source: selection.type };
};

export const featherSelection = (selection, radius = 10) => {
  const pixelSet = new Set(selection.pixels.map(p => p.join(',')));
  const feathered = new Set(pixelSet);
  
  for (const pixel of pixelSet) {
    const [x, y] = pixel.split(',').map(Number);
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= radius && dist > 0) {
          feathered.add(`${x + dx},${y + dy}`);
        }
      }
    }
  }
  
  return {
    pixels: Array.from(feathered).map(p => p.split(',').map(Number)),
    type: 'feathered',
    radius,
    source: selection.type
  };
};
