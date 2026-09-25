export function hydrateProductStyles(): void {
  // Only the imported, mechanically marked declarations are hydrated. No CSS text, URLs or arbitrary properties.
  const styleProperties = new Set([
    'position',
    'width',
    'height',
    'overflow',
    '--cover',
    '--s-ink',
    'background',
    'color',
    'display',
    'margin-top',
  ]);
  function hydrate(root: ParentNode): void {
    const nodes = [
      ...(root instanceof Element && root.hasAttribute('data-user-style') ? [root] : []),
      ...root.querySelectorAll('[data-user-style]'),
    ];
    for (const node of nodes) {
      if (!(node instanceof HTMLElement || node instanceof SVGElement)) continue;
      const value = node.getAttribute('data-user-style') ?? '';
      for (const declaration of value.split(';')) {
        const colon = declaration.indexOf(':');
        const property = declaration.slice(0, colon).trim(),
          val = declaration.slice(colon + 1).trim();
        if (
          colon > 0 &&
          styleProperties.has(property) &&
          /^[#\w\s.%,()-]+$/.test(val) &&
          !/(url|expression|var)\s*\(/i.test(val)
        )
          node.style.setProperty(property, val);
      }
    }
  }
  hydrate(document);
  new MutationObserver((records) => {
    for (const record of records)
      for (const node of record.addedNodes) if (node instanceof Element) hydrate(node);
  }).observe(document.body, { childList: true, subtree: true });
}
