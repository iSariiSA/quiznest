/* Shared limits and raster-image validation; no network or filesystem access. */
(function(root) {
  'use strict';
  const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
  const MAX_HTML_LENGTH = 4 * 1024 * 1024;
  function imageType(bytes) {
    if (bytes.length >= 24 && [137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v)) return 'png';
    if (bytes.length >= 4 && bytes[0]===255 && bytes[1]===216 && bytes[2]===255) return 'jpeg';
    const head = String.fromCharCode(...bytes.slice(0,12));
    if (bytes.length >= 13 && /^(GIF87a|GIF89a)/.test(head)) return 'gif';
    if (bytes.length >= 16 && head.startsWith('RIFF') && head.slice(8)==='WEBP') return 'webp';
    return null;
  }
  function imageData(value) {
    if (typeof value !== 'string' || value.length > Math.ceil(MAX_IMAGE_BYTES/3)*4+40) throw new Error('Images must be PNG, JPEG, GIF, or WebP, up to 2 MB.');
    const match = /^data:image\/(png|jpeg|gif|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
    if (!match || match[2].length % 4 !== 0) throw new Error('Use an embedded PNG, JPEG, GIF, or WebP image. Add local files with Add image.');
    const payload=match[2], size=payload.length/4*3-(payload.endsWith('==')?2:payload.endsWith('=')?1:0);
    if (size > MAX_IMAGE_BYTES) throw new Error('Images must be 2 MB or smaller.');
    const head = typeof Buffer !== 'undefined' ? Buffer.from(payload.slice(0,40),'base64') : Uint8Array.from(atob(payload.slice(0,40)),c=>c.charCodeAt(0));
    if (imageType(head) !== match[1]) throw new Error('The image contents do not match its file type.');
    return value;
  }
  const policy=Object.freeze({MAX_IMAGE_BYTES,MAX_HTML_LENGTH,imageType,imageData});
  if (typeof module !== 'undefined' && module.exports) module.exports=policy;
  else root.QuiznetContentPolicy=policy;
})(globalThis);
