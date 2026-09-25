import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { runXLayerPublicWalletBrowser } from './helpers/xlayer-public-wallet-browser.mjs';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { pathToFileURL } from 'node:url';
const root = resolve(import.meta.dirname, '..');
const browserTool = resolve(
  process.env.AF_PLAYWRIGHT_PATH || '.checks/browser-tools/node_modules/playwright-core/index.mjs',
);
test(
  'public release runs original pages and candle interactions without local accounts or finance',
  { skip: !existsSync(browserTool) && 'Approved browser tool unavailable', timeout: 60000 },
  async (t) => {
    const { chromium } = await import(pathToFileURL(browserTool).href);
    const requests = [],
      errors = [];
    let config = {
      schemaVersion: 1,
      environment: 'xlayer-testnet',
      chainId: 1952,
      deploymentStatus: 'NOT_DEPLOYED',
      deployments: [],
    };
    const server = createServer(async (req, res) => {
      requests.push(req.url);
      if (req.url === '/api/xlayer/config') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(config));
        return;
      }
      const url = new URL(req.url, 'http://localhost');
      const path = resolve(root, 'dist/xlayer/web', url.pathname === '/' ? 'index.html' : `.${url.pathname}`);
      if (!path.startsWith(resolve(root, 'dist/xlayer/web') + '/')) {
        res.writeHead(404);
        res.end();
        return;
      }
      try {
        res.setHeader(
          'Content-Type',
          { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }[
            extname(path)
          ] || 'application/octet-stream',
        );
        res.end(await readFile(path));
      } catch {
        res.writeHead(404);
        res.end();
      }
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    t.after(() => {
      server.closeAllConnections();
      return new Promise((resolve) => server.close(resolve));
    });
    const origin = `http://127.0.0.1:${server.address().port}`;
    const browser = await chromium.launch({
      executablePath:
        process.env.CHROMIUM_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      headless: true,
    });
    t.after(() => browser.close());
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    await page.route('**/*', (route) =>
      new URL(route.request().url()).origin === origin ? route.continue() : route.abort(),
    );
    await page.addInitScript(() => {
      globalThis.window.AF = {
        m3OnchainRuntime: {
          connect() {
            throw Error('Untrusted injected runtime was used');
          },
        },
        m3Deployments: [{ chainId: 196 }],
      };
    });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(origin + '/#/trade/trend');
    await page.locator('[data-vault-controls] > summary').click();
    await page.getByRole('heading', { name: 'Your wallet & Vault.' }).waitFor();
    await page.waitForFunction(() =>
      globalThis.document
        .querySelector('[aria-label="X Layer Testnet connection"]')
        ?.textContent.includes('1952'),
    );
    for (const route of ['home', 'market', 'rankings', 'forum', 'account', 'trade/trend']) {
      await page.evaluate((route) => {
        globalThis.location.hash = '#/' + route;
      }, route);
      await page.waitForTimeout(80);
      const body = await page.locator('body').innerText();
      assert.doesNotMatch(
        body,
        /\bDEMO\b|\bmock\b|\bfixture\b|Alice|Bob|AF-USDC|Local prototype|[\p{Script=Han}]/iu,
        route,
      );
      assert.equal(
        await page
          .locator('[data-product-login],[data-product-claim],[data-cash],#pass-order-form,#allocate-form')
          .count(),
        0,
      );
    }
    const assertEnglishUsdt = async () => {
      assert.doesNotMatch(
        await page.locator('body').innerText(),
        /\bDEMO\b|\bmock\b|\bfixtures?\b|Alice|Bob|AF-USDC|Local prototype|[\p{Script=Han}]/iu,
      );
    };
    await page.evaluate(() => {
      globalThis.location.hash = '#/market';
    });
    await page.locator('#market-search').fill('trend');
    await assertEnglishUsdt();
    await page.locator('#market-search').fill('');
    await page.locator('#market-sort').selectOption('name');
    await assertEnglishUsdt();
    await page.locator('[data-market-category="Trend"]').click();
    await assertEnglishUsdt();
    await page.locator('[data-market-category="All"]').click();
    await page.locator('[data-compare]').nth(0).check();
    await page.locator('[data-compare]').nth(1).check();
    await page.locator('[data-action="compare-open"]').click();
    await assertEnglishUsdt();
    await page.locator('#close-dialog').click();
    await page.evaluate(() => {
      globalThis.location.hash = '#/rankings';
    });
    await page.locator('[data-rank-mode="volume"]').click();
    await assertEnglishUsdt();
    await page.locator('[data-rank-range="7d"]').click();
    await assertEnglishUsdt();
    await page.locator('#rank-search').fill('trend');
    await assertEnglishUsdt();
    await page.locator('[data-v3-action="rank-method"]').click();
    await assertEnglishUsdt();
    await page.locator('#close-dialog').click();
    await page.evaluate(() => {
      globalThis.location.hash = '#/trade/trend';
    });
    if ((await page.locator('[data-vault-controls]').getAttribute('open')) === null)
      await page.locator('[data-vault-controls] > summary').click();
    await page.getByRole('button', { name: 'Connect wallet', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: 'WALLET_PROVIDER_UNAVAILABLE' }).first().waitFor();
    assert.equal(await page.locator('[data-chain-action]:not([disabled])').count(), 0);
    const chart = page.locator('[data-v3-chart="price"]');
    await chart.scrollIntoViewIfNeeded();
    const point = await chart.evaluate((svg) => {
      const p = svg.createSVGPoint();
      p.x = (globalThis.window.AF.charts.G.L + globalThis.window.AF.charts.G.R) / 2;
      p.y = 150;
      const screen = p.matrixTransform(svg.getScreenCTM());
      return { x: screen.x, y: screen.y };
    });
    await page.mouse.move(point.x, point.y);
    await page.locator('[data-candle-tooltip]').waitFor();
    assert.match(await page.locator('[data-candle-tooltip]').innerText(), /Candle details[\s\S]*OKB/);
    await page.getByRole('button', { name: '7D', exact: true }).first().click();
    await page.getByRole('button', { name: 'Line', exact: true }).click();
    await page.getByRole('button', { name: 'Candles', exact: true }).click();
    assert.deepEqual(errors, []);
    assert.deepEqual(
      requests.filter((url) => url.startsWith('/api/')),
      ['/api/xlayer/config'],
    );
    assert.equal(
      requests.some((url) => url.includes('product-local-ui')),
      false,
    );
    assert.deepEqual(
      await page.evaluate(() => ({
        idle: globalThis.window.AF.store.read().idle,
        cash: globalThis.window.AF.exchange.read().cash,
      })),
      { idle: 0, cash: 0 },
    );
    await mkdir(resolve(root, 'outputs/xlayer-r2-ui'), { recursive: true });
    await page.screenshot({ path: resolve(root, 'outputs/xlayer-r2-ui/public-trade.png'), fullPage: true });
    config = { ...config, chainId: 196 };
    await page.reload();
    await page.getByRole('alert').filter({ hasText: 'INVALID_XLAYER_PUBLIC_CONFIG' }).waitFor();
    assert.equal(await page.locator('[data-chain-action]:not([disabled])').count(), 0);
    t.diagnostic(JSON.stringify(await runXLayerPublicWalletBrowser(browser, origin)));
    t.diagnostic(
      `Chromium ${browser.version()}; no external requests or wallet broadcast; injection ignored; invalid config failed closed.`,
    );
  },
);
