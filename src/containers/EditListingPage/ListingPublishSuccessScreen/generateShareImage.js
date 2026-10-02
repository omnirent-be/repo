// Composes the 9:16 "share this on Instagram/WhatsApp" image shown on
// ListingPublishSuccessScreen.js: the listing's cover photo, its title, and
// the marketplace logo, drawn onto an HTML5 canvas and exported as a PNG
// blob. No canvas/image library is used or needed - just the browser's
// native Canvas API - since none was already a project dependency.

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1920;

// Known variant key names used for listing images in this codebase (see
// EditListingPage.duck.js's getImageVariantInfo / configLayout.js for the
// ones generated right after upload, and ListingPage.duck.js for the wider
// set generated once a listing is fully published) - picks the largest one
// actually present rather than assuming a single fixed name.
const PREFERRED_IMAGE_VARIANTS = [
  'scaled-xlarge',
  'scaled-large',
  'scaled-medium',
  'listing-card-2x',
  'listing-card',
  'square-small2x',
  'square-small',
];

export const getListingImageUrl = image => {
  const variants = image?.attributes?.variants || {};
  const key = PREFERRED_IMAGE_VARIANTS.find(name => variants[name]?.url) || Object.keys(variants)[0];
  return key ? variants[key].url : null;
};

// config.branding.logoImageDesktop is either a Console-hosted "imageAsset"
// entity (attributes.variants.scaled.url) or, when not customized in
// Console, a plain imported local file URL string - see Logo.js.
export const getBrandLogoUrl = branding => {
  const logoImageDesktop = branding?.logoImageDesktop;
  if (logoImageDesktop?.type === 'imageAsset') {
    return logoImageDesktop.attributes?.variants?.scaled?.url || null;
  }
  return typeof logoImageDesktop === 'string' ? logoImageDesktop : null;
};

const loadImage = url => {
  return new Promise((resolve, reject) => {
    if (!url) {
      resolve(null);
      return;
    }
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // Missing logo/photo shouldn't block the whole image.
    img.src = url;
  });
};

// Draws `img` onto the canvas at (x, y, w, h) using "cover" scaling
// (fills the target box, cropping overflow, like CSS background-size: cover).
const drawImageCover = (ctx, img, x, y, w, h) => {
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;
  let sx, sy, sw, sh;
  if (imgRatio > boxRatio) {
    sh = img.height;
    sw = sh * boxRatio;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    sw = img.width;
    sh = sw / boxRatio;
    sx = 0;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
};

// Breaks `text` into lines that each fit within maxWidth for the context's
// current font, for canvas text (which has no built-in wrapping).
const wrapText = (ctx, text, maxWidth) => {
  const words = text.split(' ');
  const lines = [];
  let currentLine = words[0] || '';

  for (let i = 1; i < words.length; i++) {
    const testLine = `${currentLine} ${words[i]}`;
    if (ctx.measureText(testLine).width <= maxWidth) {
      currentLine = testLine;
    } else {
      lines.push(currentLine);
      currentLine = words[i];
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines;
};

/**
 * Builds the shareable 9:16 image for a freshly published listing.
 *
 * @param {Object} params
 * @param {string} params.title - listing title
 * @param {string} [params.imageUrl] - listing's cover photo URL (see getListingImageUrl)
 * @param {string} [params.logoUrl] - marketplace logo URL (see getBrandLogoUrl)
 * @param {string} params.caption - short caption drawn above the title, e.g. "Nu te huur op OmniRent!"
 * @returns {Promise<Blob|null>} PNG blob, or null if canvas export failed
 *   (e.g. the photo's CDN doesn't allow cross-origin canvas reads) - callers
 *   should fall back to the copy-link option in that case, not treat it as
 *   a hard error.
 */
export const generateShareImage = async ({ title, imageUrl, logoUrl, caption }) => {
  const canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext('2d');

  // Background fallback color, visible if there's no photo or it fails to load.
  ctx.fillStyle = '#0b3d3a';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const [listingImg, logoImg] = await Promise.all([loadImage(imageUrl), loadImage(logoUrl)]);

  if (listingImg) {
    drawImageCover(ctx, listingImg, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  // Bottom gradient so white text stays legible over any photo.
  const gradientHeight = CANVAS_HEIGHT * 0.55;
  const gradient = ctx.createLinearGradient(0, CANVAS_HEIGHT - gradientHeight, 0, CANVAS_HEIGHT);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.8)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, CANVAS_HEIGHT - gradientHeight, CANVAS_WIDTH, gradientHeight);

  const marginX = 72;
  const maxTextWidth = CANVAS_WIDTH - marginX * 2;

  // Caption (e.g. "Nu te huur op OmniRent!")
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '600 40px Arial, sans-serif';
  const captionY = CANVAS_HEIGHT - 340;
  ctx.fillText(caption, marginX, captionY);

  // Title, wrapped across up to 3 lines.
  ctx.font = 'bold 64px Arial, sans-serif';
  const titleLines = wrapText(ctx, title || '', maxTextWidth).slice(0, 3);
  let lineY = captionY + 76;
  titleLines.forEach(line => {
    ctx.fillText(line, marginX, lineY);
    lineY += 74;
  });

  // Logo chip, bottom-left, on a white rounded rectangle for contrast
  // against any photo.
  if (logoImg) {
    const logoMaxHeight = 64;
    const logoScale = logoMaxHeight / logoImg.height;
    const logoWidth = logoImg.width * logoScale;
    const chipPaddingX = 24;
    const chipPaddingY = 16;
    const chipWidth = logoWidth + chipPaddingX * 2;
    const chipHeight = logoMaxHeight + chipPaddingY * 2;
    const chipX = marginX;
    const chipY = CANVAS_HEIGHT - 96 - chipHeight;
    const radius = 16;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(chipX + radius, chipY);
    ctx.arcTo(chipX + chipWidth, chipY, chipX + chipWidth, chipY + chipHeight, radius);
    ctx.arcTo(chipX + chipWidth, chipY + chipHeight, chipX, chipY + chipHeight, radius);
    ctx.arcTo(chipX, chipY + chipHeight, chipX, chipY, radius);
    ctx.arcTo(chipX, chipY, chipX + chipWidth, chipY, radius);
    ctx.closePath();
    ctx.fill();

    ctx.drawImage(logoImg, chipX + chipPaddingX, chipY + chipPaddingY, logoWidth, logoMaxHeight);
  }

  return new Promise(resolve => {
    try {
      canvas.toBlob(blob => resolve(blob), 'image/png');
    } catch (e) {
      // Tainted canvas (CORS) or another export failure - let the caller
      // fall back to the copy-link option instead of crashing the screen.
      resolve(null);
    }
  });
};
