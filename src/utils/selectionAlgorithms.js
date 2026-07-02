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
  
  const pixelIndex = (px, py) => (py * width + px) * 4;
  const getPixelColor = (px, py) => {
    const idx = pixelIndex(px, py);
    return [data[idx], data[idx + 1], data[idx + 2], data[idx + 3]];
  };
  
  const colorDistance = (c1, c2) => {
    const [r1, g1, b1, a1] = c1;
    const [r2, g2, b2, a2] = c2;
    return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2 + (a1 - a2) ** 2);
  };
  
  const targetColor = getPixelColor(Math.floor(x), Math.floor(y));
  const visited = new Set();
  const selectedPixels = [];
  const queue = [[Math.floor(x), Math.floor(y)]];
  
  while (queue.length > 0) {
    const [px, py] = queue.shift();
    const key = `${px},${py}`;
    
    if (visited.has(key) || px < 0 || px >= width || py < 0 || py >= height) continue;
    visited.add(key);
    
    const pixelColor = getPixelColor(px, py);
    if (colorDistance(pixelColor, targetColor) <= tolerance) {
      selectedPixels.push([px, py]);
      queue.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]);
    }
  }
  
  return { pixels: selectedPixels, type: 'magicWand', tolerance, centerX: x, centerY: y };
};

// =====================================================
// BRUSH SELECTION (Freehand drawing)
// =====================================================
export const brushSelection = (points, brushSize = 5) => {
  const selectedPixels = [];
  const brushRadius = brushSize / 2;
  
  for (let i = 0; i < points.length; i++) {
    const [x, y] = points[i];
    
    // Create circle of pixels around each point
    for (let dx = -brushRadius; dx <= brushRadius; dx++) {
      for (let dy = -brushRadius; dy <= brushRadius; dy++) {
        if (dx * dx + dy * dy <= brushRadius * brushRadius) {
          selectedPixels.push([Math.floor(x + dx), Math.floor(y + dy)]);
        }
      }
    }
    
    // Interpolate between points for smooth lines
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
              selectedPixels.push([ix + dx, iy + dy]);
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
    points
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
    bounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
  };
};

// =====================================================
// CIRCLE/ELLIPSE SELECTION
// =====================================================
export const circleSelection = (centerX, centerY, radiusX, radiusY = radiusX) => {
  const selectedPixels = [];
  
  for (let y = Math.floor(centerY - radiusY); y <= Math.floor(centerY + radiusY); y++) {
    for (let x = Math.floor(centerX - radiusX); x <= Math.floor(centerX + radiusX); x++) {
      const dx = (x - centerX) / radiusX;
      const dy = (y - centerY) / radiusY;
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
    radiusY
  };
};

// =====================================================
// LASSO SELECTION (Free polygon)
// =====================================================
export const lassoSelection = (points) => {
  const selectedPixels = [];
  
  if (points.length < 3) return { pixels: [], type: 'lasso', points };
  
  // Use ray casting algorithm to fill polygon
  const minY = Math.floor(Math.min(...points.map(p => p[1])));
  const maxY = Math.ceil(Math.max(...points.map(p => p[1])));
  
  for (let y = minY; y <= maxY; y++) {
    let intersections = [];
    
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      
      if ((p1[1] <= y && p2[1] > y) || (p2[1] <= y && p1[1] > y)) {
        const x = (p2[0] - p1[0]) * (y - p1[1]) / (p2[1] - p1[1]) + p1[0];
        intersections.push(x);
      }
    }
    
    intersections.sort((a, b) => a - b);
    
    for (let i = 0; i < intersections.length; i += 2) {
      const x1 = Math.floor(intersections[i]);
      const x2 = Math.floor(intersections[i + 1]);
      for (let x = x1; x <= x2; x++) {
        selectedPixels.push([x, y]);
      }
    }
  }
  
  return { pixels: selectedPixels, type: 'lasso', points };
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
