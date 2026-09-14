import { isPattern, type Options, type Pattern, type Source } from '../model.js';
import { renderSvg } from '../renderer.js';

/** Small, on-device comparison images. Crop geometry remains owned by renderSvg. */
export class ShapePreviews {
  private source: Source | null = null;
  private signature = '';
  private readonly urls = new Map<HTMLImageElement, string>();
  private readonly images: { image: HTMLImageElement; shape: SVGElement; pattern: Pattern }[];

  constructor(container: HTMLElement) {
    this.images = [...container.querySelectorAll<HTMLImageElement>('img[data-shape-preview]')].map(image => {
      const pattern = image.dataset.shapePreview;
      const shape = image.parentElement?.querySelector<SVGElement>('svg');
      if (!isPattern(pattern) || !shape) throw new Error('Invalid shape preview markup.');
      return { image, shape, pattern };
    });
  }

  setSource(image: HTMLImageElement): void {
    this.clear();
    // Resample only when the source changes, not on every slider input. Preserve the
    // source dimensions so thumbnail geometry also matches very narrow/wide images.
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 128 / Math.max(image.naturalWidth, image.naturalHeight));
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    // SVG editing does not require Canvas; silhouettes remain usable without it.
    if (!context) return;
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    this.source = { data: canvas.toDataURL('image/png'), width: image.naturalWidth, height: image.naturalHeight };
  }

  render(options: Options): void {
    if (!this.source) return;
    const signature = JSON.stringify({ ...options, pattern: 'circle', url: '' });
    if (signature === this.signature) return;
    for (const { image, shape, pattern } of this.images) {
      const svg = renderSvg(this.source, { ...options, pattern });
      const next = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
      const previous = this.urls.get(image);
      image.src = next;
      image.hidden = false;
      shape.setAttribute('hidden', '');
      this.urls.set(image, next);
      if (previous) URL.revokeObjectURL(previous);
    }
    this.signature = signature;
  }

  clear(): void {
    for (const { image, shape } of this.images) {
      image.removeAttribute('src');
      image.hidden = true;
      shape.removeAttribute('hidden');
    }
    for (const url of this.urls.values()) URL.revokeObjectURL(url);
    this.urls.clear();
    this.source = null;
    this.signature = '';
  }
}
