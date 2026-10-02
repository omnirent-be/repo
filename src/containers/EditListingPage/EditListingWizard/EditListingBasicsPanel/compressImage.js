// Compresses a photo client-side before it's uploaded, so a provider's
// phone photos (often several MB, way wider than anything the listing UI
// ever displays) don't sit on slow mobile connections for no benefit. Pure
// Canvas API, no new dependency - same approach as generateShareImage.js.

const MAX_DIMENSION = 1600;
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const INITIAL_QUALITY = 0.85;
const MIN_QUALITY = 0.5;
const QUALITY_STEP = 0.1;

const loadImageFromFile = file => {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = e => {
      URL.revokeObjectURL(objectUrl);
      reject(e);
    };
    img.src = objectUrl;
  });
};

const canvasToBlob = (canvas, type, quality) => {
  return new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob), type, quality);
  });
};

/**
 * Resizes `file` down to at most 1600px on its longest side and re-encodes
 * it as JPEG, stepping quality down until it's under 2MB (or MIN_QUALITY is
 * reached, whichever comes first).
 *
 * @param {File} file - the original image file, straight from the file input
 * @returns {Promise<File>} the compressed file, or the original file
 *   unchanged if it's not a raster image type, is already small, or
 *   anything about the compression fails - never blocks the upload.
 */
export const compressImage = async file => {
  if (!file || !file.type || !file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    return file;
  }

  try {
    const img = await loadImageFromFile(file);
    const longestSide = Math.max(img.width, img.height);
    const scale = longestSide > MAX_DIMENSION ? MAX_DIMENSION / longestSide : 1;
    const width = Math.round(img.width * scale);
    const height = Math.round(img.height * scale);

    // Nothing to gain: already small enough on both axes and under the size
    // cap - skip re-encoding (which would just add generation loss).
    if (scale === 1 && file.size <= MAX_SIZE_BYTES) {
      return file;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, width, height);

    let quality = INITIAL_QUALITY;
    let blob = await canvasToBlob(canvas, 'image/jpeg', quality);
    while (blob && blob.size > MAX_SIZE_BYTES && quality > MIN_QUALITY) {
      quality -= QUALITY_STEP;
      blob = await canvasToBlob(canvas, 'image/jpeg', quality);
    }

    if (!blob) {
      return file;
    }

    const newName = file.name.replace(/\.[^./\\]+$/, '') + '.jpg';
    return new File([blob], newName, { type: 'image/jpeg' });
  } catch (e) {
    return file;
  }
};

export default compressImage;
