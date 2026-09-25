import assert from 'node:assert/strict';
import { keccak256Evm } from '../../apps/web/src/evm-keccak.ts';
import { asHexData } from '../../packages/chain-adapter/src/types.ts';

export async function runXLayerPublicWalletBrowser(browser, origin) {
  const address = (digit) => `0x${digit.repeat(40)}`;
  const owner = address('1'),
    vault = address('2'),
    token = address('3'),
    pass = address('4'),
    secondVault = address('b');
  const hash = `0x${'cd'.repeat(32)}`,
    strategy = `0x${'01'.repeat(32)}`;
  const deployment = {
    source: 'reviewed-deployment-manifest',
    chainId: 1952,
    vaultAddress: vault,
    deploymentBlock: '1',
    abiVersion: 'm3-vault-db620d6',
    abiHash: '0x264b4498cf396008e4619664c59bf8d8eac0a04f04b80e760df3cfbc00846977',
    manifestDigest: `0x${'12'.repeat(32)}`,
    runtimeBytecodeHash: keccak256Evm(asHexData('0x6000')),
    strategyPassAddress: pass,
    strategyPassDeploymentBlock: '2',
    strategyPassAbiHash: '0xdd989644feeb7798baca69f7391ba75b6f9d09f47fb05bd90184f6072912923f',
    strategyPassRuntimeBytecodeHash: keccak256Evm(asHexData('0x6001')),
  };
  const deployments = [deployment, { ...deployment, vaultAddress: secondVault }];
  const config = {
    schemaVersion: 1,
    environment: 'xlayer-testnet',
    chainId: 1952,
    deploymentStatus: 'DEPLOYED',
    deployments,
  };
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  page.setDefaultTimeout(8_000);
  const errors = [],
    registrations = [],
    apiReads = [],
    externalRequests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.route('**/*', async (route) => {
    const request = route.request(),
      url = new URL(request.url());
    if (url.origin !== origin) {
      externalRequests.push(url.origin);
      return route.abort();
    }
    if (url.pathname === '/api/xlayer/config') return route.fulfill({ json: config });
    if (!url.pathname.startsWith('/api/v1/chain/')) return route.continue();
    if (request.method() === 'POST') {
      const input = request.postDataJSON();
      assert.equal(input.chainId, 1952);
      registrations.push(input);
      return route.fulfill({
        status: 202,
        json: { ...input, state: 'SUBMITTED', submittedAt: '2026-09-26T00:00:00.000Z' },
      });
    }
    apiReads.push(url.pathname);
    assert.equal(url.searchParams.get('chainId'), '1952');
    const contract = url.pathname.split('/').at(-2);
    if (url.pathname.includes('/runtime-status/')) {
      const dep = deployments.find((item) => item.vaultAddress === url.pathname.split('/').at(-1));
      assert.ok(dep);
      return route.fulfill({
        json: {
          lastAttempt: 'SUCCEEDED',
          errorCode: null,
          database: { status: 'HEALTHY', schemaVersion: 6, integrity: 'OK' },
          deployment: {
            chainId: 1952,
            contract: dep.vaultAddress,
            manifestDigest: dep.manifestDigest,
            abiHash: dep.abiHash,
            runtimeBytecodeHash: dep.runtimeBytecodeHash,
            strategyPassAddress: pass,
            strategyPassAbiHash: dep.strategyPassAbiHash,
            strategyPassRuntimeBytecodeHash: dep.strategyPassRuntimeBytecodeHash,
          },
        },
      });
    }
    if (url.pathname.includes('/operations/'))
      return route.fulfill({
        json: {
          operationId: contract,
          lifecycle: 'CONFIRMED',
          receipt: 'SUCCESS',
          receiptCanonical: true,
          confirmations: 3,
          reconciliation: 'MATCHED',
          projection: 'READY',
          chainStatus: 'SOFT_READY',
          l1Status: 'UNKNOWN',
          finalityStatus: 'UNKNOWN',
          indexerStatus: 'HEALTHY',
          degradedReason: null,
          productReady: true,
        },
      });
    const passRead = url.pathname.includes('/passes/');
    return route.fulfill({
      json: {
        chainId: 1952,
        owner,
        contract,
        projectionKey: passRead ? 'm3-strategy-pass' : 'm3-vault',
        blockNumber: '100',
        blockHash: hash,
        state: passRead
          ? { owner, pass, strategyId: strategy, decimals: 18, balanceRaw: '2000000000000000000' }
          : {
              owner,
              strategyCreator: address('5'),
              strategyId: strategy,
              strategyRef: `0x${'02'.repeat(32)}`,
              pass,
              passStrategyId: strategy,
              afUsdc: token,
              afEth: address('6'),
              afBtc: address('7'),
              passLocker: address('8'),
              principalBasis: '0',
              trackedUsdcBalance: '0',
              realizedProfit: '0',
              withdrawableUsdc: '0',
              trackedAfEth: '0',
              trackedAfBtc: '0',
              openTrackedPositionCount: '0',
              closed: false,
            },
      },
    });
  });
  await page.addInitScript(
    ({ owner, token, pass }) => {
      const word = (value) => `0x${BigInt(value).toString(16).padStart(64, '0')}`;
      const addressWord = (address) => `0x${address.slice(2).padStart(64, '0')}`;
      const state = { chainId: 196, requests: [], allowances: {} };
      globalThis.__xlayerWallet = state;
      globalThis.ethereum = {
        on() {},
        removeListener() {},
        async request(input) {
          state.requests.push(input);
          if (['eth_accounts', 'eth_requestAccounts'].includes(input.method)) return [owner];
          if (input.method === 'eth_chainId') return `0x${state.chainId.toString(16)}`;
          if (input.method === 'eth_getCode')
            return input.params[0].toLowerCase() === pass ? '0x6001' : '0x6000';
          if (input.method === 'eth_getBalance') return '0x22b1c8c1227a0000';
          if (input.method === 'eth_call') {
            const { data, to } = input.params[0];
            if (data === '0x8b5a851f') return addressWord(token);
            if (data === '0xa7a1ed72') return addressWord(pass);
            if (data.startsWith('0xdd62ed3e')) return word(state.allowances[to + data.slice(-40)] || '0');
            if (data.startsWith('0x70a08231')) return word('2000000000000000000');
            return '0x';
          }
          if (input.method === 'eth_sendTransaction') {
            if (state.chainId !== 1952) throw Error('Unexpected foreign-chain send');
            const { data, to } = input.params[0];
            if (data.startsWith('0x095ea7b3'))
              state.allowances[to + data.slice(34, 74)] = BigInt(`0x${data.slice(74)}`).toString();
            return `0x${state.requests
              .filter((x) => x.method === 'eth_sendTransaction')
              .length.toString(16)
              .padStart(64, '0')}`;
          }
          throw Error(`Unexpected RPC ${input.method}`);
        },
      };
    },
    { owner, token, pass },
  );
  try {
    await page.goto(origin + '/#/account');
    const connect = page.locator('[data-chain-connect]');
    await page.waitForFunction(() =>
      globalThis.document
        .querySelector('[aria-label="X Layer Testnet connection"]')
        ?.textContent.includes('1952'),
    );
    for (const chainId of [195, 196, 46630]) {
      await page.evaluate((id) => {
        globalThis.__xlayerWallet.chainId = id;
      }, chainId);
      await connect.click();
      await page.getByRole('alert').filter({ hasText: 'WALLET_WRONG_CHAIN' }).first().waitFor();
      assert.equal(await page.locator('[data-chain-action]:not([disabled])').count(), 0);
    }
    await page.evaluate(() => {
      globalThis.__xlayerWallet.chainId = 1952;
    });
    await connect.click();
    await page.locator('.wallet-amount').getByText('2.5').waitFor();
    await page.evaluate(() => {
      globalThis.location.hash = '#/trade/trend';
    });
    await page.locator('[data-vault-controls] > summary').click();
    await page.locator('[data-chain-action="deposit"]:not([disabled])').waitFor();
    async function depositReview() {
      await page.locator('[data-chain-action="deposit"]').click();
      await page.locator('[name="chainAmount"]').fill('1.000001');
      await page.locator('[data-chain-review]').click();
    }
    for (const kind of ['af-usdc', 'pass']) {
      await depositReview();
      assert.match(await page.locator('dialog[open]').innerText(), /USDT/);
      await page.locator(`[data-chain-approve="${kind}"]`).click();
      await page.locator('dialog[open]').waitFor({ state: 'hidden' });
    }
    await depositReview();
    await page.locator('[data-chain-confirm]').click();
    await page.locator('dialog[open]').waitFor({ state: 'hidden' });
    await page.locator('[data-chain-refresh]').click();
    await page.locator('[data-pass-transfer]:not([disabled])').click();
    await page.locator('[name="passRecipient"]').fill(address('9'));
    await page.locator('[name="passAmount"]').fill('0.000000000000000001');
    await page.locator('[data-pass-review]').click();
    await page.locator('[data-pass-confirm]').waitFor();
    await page.evaluate(() => {
      globalThis.__xlayerWallet.chainId = 46630;
    });
    await page.locator('[data-pass-confirm]').click();
    await page.locator('[data-product-dialog-error]').filter({ hasText: 'WALLET_WRONG_CHAIN' }).waitFor();
    assert.equal(
      await page.evaluate(
        () => globalThis.__xlayerWallet.requests.filter((x) => x.method === 'eth_sendTransaction').length,
      ),
      3,
    );
    await page.locator('#close-dialog').click();
    await page.evaluate(() => {
      globalThis.__xlayerWallet.chainId = 1952;
    });
    await connect.click();
    await page.locator('[data-pass-transfer]:not([disabled])').click();
    await page.locator('[name="passRecipient"]').fill(address('9'));
    await page.locator('[name="passAmount"]').fill('0.000000000000000001');
    await page.locator('[data-pass-review]').click();
    await page.locator('[data-pass-confirm]').click();
    await page.locator('dialog[open]').waitFor({ state: 'hidden' });
    await page.locator('[data-chain-vault-select]').selectOption(`1952:${secondVault}`);
    await connect.click();
    await page.locator('[data-chain-action="close"]:not([disabled])').waitFor();
    const sends = await page.evaluate(() =>
      globalThis.__xlayerWallet.requests
        .filter((x) => x.method === 'eth_sendTransaction')
        .map((x) => x.params[0]),
    );
    assert.equal(sends.length, 4);
    assert.equal(sends[0].to, token);
    assert.equal(BigInt('0x' + sends[0].data.slice(-64)), 1000001n);
    assert.equal(sends[1].to, pass);
    assert.equal(BigInt('0x' + sends[1].data.slice(-64)), 1000001000000000000n);
    assert.equal(sends[2].to, vault);
    assert.equal(sends[3].to, pass);
    assert.equal(BigInt('0x' + sends[3].data.slice(-64)), 1n);
    assert.equal(registrations.length, 2);
    assert.ok(apiReads.some((path) => path.includes('/runtime-status/')));
    assert.ok(apiReads.some((path) => path.includes(secondVault)));
    assert.deepEqual(externalRequests, []);
    assert.deepEqual(errors, []);
    return { chainId: 1952, mockWalletSends: sends.length, registrations: registrations.length };
  } finally {
    await page.close();
  }
}
