import { readM3BuildMode } from './xlayer-public-config.ts';

try {
  const mode = readM3BuildMode(import.meta.env);
  if (import.meta.env.VITE_AF_APP_MODE === 'testnet' && mode === 'testnet')
    await import('./xlayer-public-ui.ts');
  else if (import.meta.env.VITE_AF_APP_MODE === 'preview' && mode === 'preview')
    await import('./xlayer-preview-ui.ts');
  else if (import.meta.env.VITE_AF_APP_MODE !== 'preview' && mode === 'local')
    await import('./product-local-ui.ts');
} catch (error) {
  const main = document.querySelector('main');
  if (main) {
    main.replaceChildren();
    const notice = document.createElement('p');
    notice.className = 'wrap dialog-notice';
    notice.setAttribute('role', 'alert');
    notice.textContent = error instanceof Error ? error.message : 'APPLICATION_UNAVAILABLE';
    main.append(notice);
  }
}
