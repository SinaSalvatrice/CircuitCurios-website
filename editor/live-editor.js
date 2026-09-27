
(() => {
  const hugoUrl = window.CC_HUGO_EDITOR_URL || 'http://127.0.0.1:1313/';
  const preview = location.href.replace(/[?&]cceditor(?:=[^&]*)?/,'').replace(/[?&]$/,'');
  const target = new URL(hugoUrl);
  target.searchParams.set('api', location.origin);
  target.searchParams.set('preview', preview);

  document.documentElement.setAttribute('data-cc-hugo-host','');
  document.body.innerHTML = '';
  const frame=document.createElement('iframe');
  frame.id='cc-hugo-editor-frame';
  frame.src=target.href;
  frame.title='CircuitCurios Webeditor';
  document.body.appendChild(frame);

  const fallback=document.createElement('div');
  fallback.id='cc-hugo-editor-fallback';
  fallback.innerHTML='<strong>Hugo-Webeditor nicht erreichbar.</strong><span>Starte editor/serve-hugo.ps1 und lade die Seite neu.</span>';
  document.body.appendChild(fallback);

  frame.addEventListener('load',()=>fallback.remove());
})();
