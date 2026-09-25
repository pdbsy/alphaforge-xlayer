import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const source = readFileSync(new URL('../apps/web/prototype/AlphaForge_v3_EN.html', import.meta.url), 'utf8');
function prototype(publicMode) {
  let reads = 0,
    writes = 0;
  const context = {
    AF_PUBLIC_MODE: publicMode,
    structuredClone,
    console,
    document: { querySelector: () => ({ content: publicMode ? 'testnet' : '' }) },
    localStorage: {
      getItem() {
        reads++;
        return null;
      },
      setItem() {
        writes++;
      },
    },
  };
  context.window = context;
  runInNewContext(
    source.slice(source.indexOf('<script>') + 8, source.indexOf('/* Application controller.')),
    context,
  );
  return { AF: context.AF, reads: () => reads, writes: () => writes };
}
test('public prototype forbids both local funding ledgers before rendering or persistent storage access', () => {
  const { AF, reads, writes } = prototype(true);
  assert.equal(AF.store.read().idle, 0);
  assert.equal(AF.exchange.read().cash, 0);
  for (const type of [
    'claim',
    'allocate',
    'release',
    'deposit',
    'withdraw',
    'confirmWithdrawal',
    'cancelWithdrawal',
    'reset',
  ])
    assert.throws(() => AF.store.dispatch({ type, strategy: 'trend', amount: 1 }), /LOCAL_FINANCE_DISABLED/);
  assert.throws(
    () => AF.exchange.quote({ strategy: 'trend', side: 'buy', qty: 1 }),
    /LOCAL_FINANCE_DISABLED/,
  );
  assert.throws(() => AF.exchange.execute({}), /LOCAL_FINANCE_DISABLED/);
  assert.throws(() => AF.exchange.reset(), /LOCAL_FINANCE_DISABLED/);
  assert.equal(reads(), 0);
  assert.equal(writes(), 0);
});
test('local prototype retains its historical isolated funding behavior', () => {
  const { AF } = prototype(false);
  const before = AF.store.read().idle;
  AF.store.dispatch({ type: 'deposit', amount: 100 });
  assert.equal(AF.store.read().idle, before + 100);
  assert.equal(AF.exchange.read().cash, 1000000);
});

test('public dynamic catalogue and ranking source render OKB after every filter refresh', () => {
  const { AF } = prototype(true);
  for (const query of ['', 'trend']) {
    AF.view.marketQuery = query;
    AF.view.marketSort = 'name';
    const cards = AF.market.results();
    assert.match(cards, /OKB/);
    assert.doesNotMatch(cards, /DEMO/);
  }
  for (const mode of ['price', 'volume', 'returns', 'risk']) {
    AF.view.rankMode = mode;
    for (const range of ['24h', '7d', '30d']) {
      AF.view.rankRange = range;
      assert.doesNotMatch(AF.pages.rankings(), /DEMO/);
      assert.match(AF.pages.rankings(), /OKB/);
    }
  }
});
