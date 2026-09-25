import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
function build(script) {
  const result = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8', timeout: 120_000 });
  assert.equal(result.status, 0, result.stdout + result.stderr);
}
async function assets(path) {
  const folder = resolve(root, path);
  const names = await readdir(folder, { recursive: true });
  return {
    names,
    source: (
      await Promise.all(
        names
          .filter((name) => /\.(?:html|js)$/.test(name))
          .map((name) => readFile(resolve(folder, name), 'utf8')),
      )
    ).join('\n'),
  };
}

test('preview is an explicit, isolated build served by its configured command', async (t) => {
  build('tools/build-xlayer-preview.mjs');
  const preview = await assets('dist/xlayer/preview');
  assert.ok(preview.names.includes('xlayer-preview-mode.js'));
  assert.match(preview.source, /data-preview-connect/);
  assert.match(preview.source, /alphaforge\.passmarket\.xlayer-preview\.v1/);
  assert.doesNotMatch(preview.source, /loadXLayerPublicRuntime|\/api\/xlayer\/config|window\.ethereum/);
  assert.doesNotMatch(preview.source, /xlayer-mode\.js/);
  const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
  const [command, ...args] = pkg.scripts['preview:xlayer'].split(' ');
  assert.equal(command, 'vite');
  const server = spawn(
    process.execPath,
    [resolve(root, 'node_modules/vite/bin/vite.js'), ...args, '--port', '0'],
    {
      cwd: root,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NO_COLOR: '1' },
    },
  );
  const closed = once(server, 'close');
  t.after(async () => {
    server.kill();
    await closed;
  });
  const origin = await new Promise((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(() => reject(Error(`Preview did not start: ${output}`)), 15000);
    const collect = (chunk) => {
      output += chunk;
      const ready = output.match(/Local:\s+(http:\/\/127\.0\.0\.1:\d+\/)/);
      if (ready) {
        clearTimeout(timeout);
        resolve(ready[1]);
      }
    };
    server.stdout.on('data', collect);
    server.stderr.on('data', collect);
    server.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    server.once('close', (code) => {
      clearTimeout(timeout);
      reject(Error(`Preview exited ${code}: ${output}`));
    });
  });
  const response = await fetch(origin);
  assert.equal(response.status, 200);
  assert.equal(
    await response.text(),
    await readFile(resolve(root, 'dist/xlayer/preview/index.html'), 'utf8'),
  );
  const mode = await fetch(new URL('xlayer-preview-mode.js', origin));
  assert.equal(mode.status, 200);
  assert.equal(await mode.text(), 'window.AF_PREVIEW_MODE = true;\n');
  const browserTool = resolve(
    process.env.AF_PLAYWRIGHT_PATH || '.checks/browser-tools/node_modules/playwright-core/index.mjs',
  );
  if (existsSync(browserTool)) {
    const { chromium } = await import(pathToFileURL(browserTool).href);
    const browser = await chromium.launch({
      executablePath:
        process.env.CHROMIUM_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      headless: true,
    });
    t.after(() => browser.close());
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(origin + '#/account');
    await page.locator('[data-preview-connect]').click();
    const holding = page.locator('[data-wallet-position="trend"]');
    await holding.locator('summary').click();
    await page.getByRole('heading', { name: 'Strategy funds' }).waitFor();
    assert.match(await holding.innerText(), /Wallet available[\s\S]*10000 USDT[\s\S]*Available Pass/);
    await holding.locator('[data-wallet-funding-form] input[name="amount"]').fill('1.5');
    await holding.getByRole('button', { name: /Review deposit/ }).click();
    const dialog = page.locator('dialog[open]');
    assert.match(await dialog.innerText(), /1\.5 USDT/);
    await dialog.getByRole('button', { name: 'Confirm deposit' }).click();
    await page.getByText('Allocated 1.5 USDT').waitFor();
    await page.reload();
    const restored = page.locator('[data-wallet-position="trend"]');
    await restored.locator('summary').focus();
    await restored.locator('summary').press('Enter');
    await page.getByRole('heading', { name: 'Strategy funds' }).waitFor();
    await restored.getByRole('button', { name: 'Withdraw', exact: true }).click();
    assert.equal(
      await restored.locator('[data-wallet-funding-side="withdraw"]').getAttribute('aria-pressed'),
      'true',
    );
    assert.equal(
      await restored.locator('[data-wallet-funding-form] input[name="amount"]').inputValue(),
      '1.5',
    );
    await page.goto(origin + '#/trade/trend');
    const readout = await page.locator('#price-readout').innerText();
    const ohlc = [...readout.matchAll(/0\.\d{6}/g)].map(([value]) => value);
    assert.equal(ohlc.length, 4, readout);
    assert.ok(new Set(ohlc).size >= 3, readout);
    const axisLabels = await page.locator('[data-v3-chart="price"] .chart-gridline + text').allTextContents();
    assert.ok(new Set(axisLabels).size >= 4, axisLabels.join(', '));
    const chart = page.locator('[data-v3-chart="price"]');
    const geometry = await chart.evaluate((svg) => {
      const wicks = [...svg.querySelectorAll('.chart-up > line, .chart-down > line')];
      const coordinates = wicks.flatMap((line) => ['y1', 'y2'].map((name) => Number(line.getAttribute(name))));
      const grid = [...svg.querySelectorAll('.chart-gridline')].map((line) => Number(line.getAttribute('y1')));
      return { span: Math.max(...coordinates) - Math.min(...coordinates), plot: Math.max(...grid) - Math.min(...grid) };
    });
    assert.ok(geometry.span > geometry.plot / 2, `Candles are flattened: ${JSON.stringify(geometry)}`);
    await chart.focus();
    await chart.press('ArrowRight');
    const cursorY = Number(await chart.locator('#price-cursor circle').getAttribute('cy'));
    const inspectedClose = Number((await page.locator('#price-readout').innerText()).match(/C (0\.\d{6})/)?.[1]);
    const topPrice = Number(axisLabels[0]);
    const bottomPrice = Number(axisLabels.at(-1));
    const expectedY = 20 + (topPrice - inspectedClose) / (topPrice - bottomPrice) * geometry.plot;
    assert.ok(Math.abs(cursorY - expectedY) < 1, `Cursor disagrees with price axis: ${cursorY} vs ${expectedY}`);
    const chartBox = await page.locator('[data-v3-chart="price"]').boundingBox();
    assert.ok(chartBox);
    await page.mouse.move(chartBox.x + chartBox.width * 0.58, chartBox.y + chartBox.height * 0.45);
    await page.locator('[data-candle-tooltip]').waitFor();
    const tooltipChange = await page.locator('[data-candle-field="change"]').innerText();
    assert.match(tooltipChange, /0\.\d{6} OKB/);
    assert.doesNotMatch(tooltipChange, /0\.000000 OKB/);
    t.diagnostic(`Preview chart: ${readout}; axis ${axisLabels.join(', ')}; candle change ${tooltipChange}; wick span ${geometry.span.toFixed(1)}/${geometry.plot} viewBox units`);
    const displayedPrice = Number(
      (await page.locator('.quote-headline > strong').innerText()).replace(/,/g, ''),
    );
    assert.ok(displayedPrice > 0 && displayedPrice <= 0.1);
    assert.match(await page.locator('.price-unit').innerText(), /OKB/);
    await page.locator('#pass-qty').fill('1');
    await page.locator('#pass-order-form button[type="submit"]').click();
    const orderReview = page.locator('dialog[open]');
    assert.match(await orderReview.innerText(), /Maximum payment[\s\S]*OKB/);
    const payment = Number(
      (await orderReview.locator('.receipt-amount').innerText()).match(/\d+(?:\.\d+)?/)?.[0],
    );
    assert.ok(payment > 0 && payment <= 0.1);
    await orderReview.locator('[data-v3-action="commit-order"]').click();
    assert.match(await page.locator('dialog[open]').innerText(), /purchase recorded[\s\S]*OKB/i);
    await page.locator('dialog[open] [data-close]').click();
    await page.locator('[data-pass-side="sell"]').click();
    await page.locator('#pass-qty').fill('1');
    await page.locator('#pass-order-form button[type="submit"]').click();
    const saleReview = page.locator('dialog[open]');
    assert.match(await saleReview.innerText(), /Minimum proceeds[\s\S]*OKB/);
    const proceeds = Number(
      (await saleReview.locator('.receipt-amount').innerText()).match(/\d+(?:\.\d+)?/)?.[0],
    );
    assert.ok(proceeds > 0 && proceeds <= 0.1);
    await saleReview.locator('[data-v3-action="commit-order"]').click();
    assert.match(await page.locator('dialog[open]').innerText(), /sale recorded[\s\S]*OKB/i);
    await page.close();
  }
  build('tools/build-xlayer.mjs');
  const publicBuild = await assets('dist/xlayer/web');
  assert.ok(publicBuild.names.includes('xlayer-mode.js'));
  assert.doesNotMatch(publicBuild.source, /data-preview-connect|A1faF0e000000000000000000000000000000195/);
  assert.doesNotMatch(publicBuild.source, /xlayer-preview-ui|xlayer-preview-mode\.js/);
});
