from pathlib import Path


def replace(path: str, old: str, new: str) -> None:
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'marker not found in {path}: {old[:120]!r}')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')

replace(
    'css/template-maker.css',
    '  width: min(100%, calc(var(--cc-design-width) * 1px));\n',
    '  width: calc(var(--cc-design-width) * 1px);\n',
)

main = Path('js/main.js')
text = main.read_text(encoding='utf-8')
marker = "(() => {\n"
insert = """(() => {
  // Template Maker pages use one fixed logical design canvas. Fit that whole
  // canvas uniformly to the available browser width instead of squeezing only
  // the X axis while keeping height and typography at desktop scale.
  const fitTemplateCanvas = () => {
    const canvas = document.querySelector(
      '.cc-template-page > .cc-template-canvas'
    );
    if (!canvas) return;
    const style = getComputedStyle(canvas);
    const designWidth = parseFloat(
      style.getPropertyValue('--cc-design-width') || ''
    );
    if (!Number.isFinite(designWidth) || designWidth <= 0) return;
    const host = canvas.parentElement;
    const available = Math.max(
      1,
      host ? host.clientWidth : document.documentElement.clientWidth
    );
    canvas.style.zoom = String(Math.min(1, available / designWidth));
  };

  fitTemplateCanvas();
  window.addEventListener('resize', fitTemplateCanvas, { passive: true });

"""
if not text.startswith(marker):
    raise SystemExit('main.js wrapper marker not found')
main.write_text(insert + text[len(marker):], encoding='utf-8')
