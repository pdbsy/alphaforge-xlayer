import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../apps/web/prototype/AlphaForge_v3_EN.html', import.meta.url), 'utf8');
function prototype({
  preview = false,
  publicMode = false,
  connected = false,
  saved = new Map(),
  failWrites = false,
} = {}) {
  const touched = [];
  const context = {
    AF_PREVIEW_MODE: preview,
    AF_PREVIEW_CONNECTED: connected,
    AF_PUBLIC_MODE: publicMode,
    structuredClone,
    console,
    document: { querySelector: () => ({ content: publicMode ? 'testnet' : '' }) },
    localStorage: {
      getItem(key) {
        touched.push(['read', key]);
        return saved.get(key) ?? null;
      },
      setItem(key, value) {
        if (failWrites) throw Error('Storage full');
        touched.push(['write', key]);
        saved.set(key, value);
      },
    },
  };
  context.window = context;
  runInNewContext(
    source.slice(source.indexOf('<script>') + 8, source.indexOf('/* Application controller.')),
    context,
  );
  return { AF: context.AF, touched, saved };
}

test('explicit preview seed has 1,000 OKB available, Pass holdings, and conserved capital', () => {
  const { AF, touched } = prototype({ preview: true });
  const s = AF.exchange.read();
  assert.equal(s.cash, 100000);
  assert.ok(s.positions.trend.qty > 0);
  const cost = Object.values(s.positions).reduce((n, p) => n + p.cost, 0);
  assert.equal(s.cash + cost, s.initialCapital + s.realized);
  assert.equal(s.funding.asset, 'USDT');
  assert.equal(s.funding.cash, 10_000_000_000);
  assert.ok(touched.some(([, key]) => key === 'alphaforge.passmarket.xlayer-preview.v1'));
  assert.ok(!touched.some(([, key]) => key === 'alphaforge.passmarket.v3'));
});

test('preview buy/sell persists; invalid, duplicate, and expired orders do not change balances', () => {
  const saved = new Map();
  const { AF } = prototype({ preview: true, connected: true, saved });
  const before = AF.exchange.read();
  const buy = AF.exchange.review({ strategy: 'factor', side: 'buy', qty: 1 });
  AF.exchange.execute(buy);
  const bought = AF.exchange.read();
  assert.equal(bought.positions.factor.qty, 1);
  assert.ok(bought.cash < before.cash);
  assert.throws(() => AF.exchange.execute(buy), /already been executed/);
  assert.throws(() => AF.exchange.review({ strategy: 'factor', side: 'sell', qty: 2 }), /Not enough/);
  const expired = AF.exchange.review({ strategy: 'factor', side: 'sell', qty: 1 }, 1000);
  assert.throws(() => AF.exchange.execute(expired, 31000), /expired/);
  assert.equal(AF.exchange.read().revision, bought.revision);
  const sell = AF.exchange.review({ strategy: 'factor', side: 'sell', qty: 1 });
  AF.exchange.execute(sell);
  const after = AF.exchange.read();
  assert.equal(after.positions.factor.qty, 0);
  assert.ok(after.cash > bought.cash);
  assert.equal(prototype({ preview: true, connected: true, saved }).AF.exchange.read().cash, after.cash);
  assert.equal(
    after.cash + Object.values(after.positions).reduce((n, p) => n + p.cost, 0),
    after.initialCapital + after.realized,
  );
});

test('preview orders require an explicit simulated Wallet connection', () => {
  const { AF } = prototype({ preview: true });
  const before = AF.exchange.read();
  assert.throws(
    () => AF.exchange.review({ strategy: 'trend', side: 'buy', qty: 1 }),
    /Connect the simulated Wallet/,
  );
  assert.equal(AF.exchange.read().revision, before.revision);
});

test('public mode cannot turn on preview or read local storage', () => {
  const { AF, touched } = prototype({ preview: true, publicMode: true });
  assert.equal(AF.exchange.read().cash, 0);
  assert.throws(
    () => AF.exchange.review({ strategy: 'trend', side: 'buy', qty: 1 }),
    /LOCAL_FINANCE_DISABLED/,
  );
  assert.deepEqual(touched, []);
});

test('preview Pass use locks one USDT per Pass while preserving OKB trades', () => {
  const saved = new Map();
  const { AF } = prototype({ preview: true, connected: true, saved });
  const before = AF.exchange.read();
  const review = AF.exchange.reviewFunding({ strategy: 'trend', kind: 'deposit', amount: 1_500_000 });
  AF.exchange.executeFunding(review);
  const funded = AF.exchange.read();
  assert.equal(funded.cash, before.cash);
  assert.equal(funded.funding.cash, before.funding.cash - 1_500_000);
  assert.equal(AF.exchange.fundingSnapshot('trend').allocated, 1_500_000);
  assert.equal(AF.exchange.fundingSnapshot('trend').maxDeposit, 500_000);
  assert.equal(
    funded.cash + Object.values(funded.positions).reduce((n, p) => n + p.cost, 0),
    funded.initialCapital + funded.realized,
  );
  assert.equal(funded.funding.cash + funded.funding.allocations.trend, funded.funding.initialCapital);
  assert.throws(() => AF.exchange.executeFunding(review), /Review|already/);
  assert.throws(() => AF.exchange.review({ strategy: 'trend', side: 'sell', qty: 2 }), /frozen/i);
  assert.equal(
    prototype({ preview: true, connected: true, saved }).AF.exchange.fundingSnapshot('trend').allocated,
    1_500_000,
  );
  AF.exchange.executeFunding(
    AF.exchange.reviewFunding({ strategy: 'trend', kind: 'withdraw', amount: 1_500_000 }),
  );
  assert.equal(AF.exchange.fundingSnapshot('trend').allocated, 0);
  assert.equal(AF.exchange.read().funding.cash, before.funding.cash);
});

test('preview funding rejects invalid capacity, stale or expired reviews, changed storage and failed saves', () => {
  const saved = new Map();
  const { AF } = prototype({ preview: true, connected: true, saved });
  for (const amount of [0, -1, 2_000_001, 1.5, NaN])
    assert.throws(() => AF.exchange.reviewFunding({ strategy: 'trend', kind: 'deposit', amount }));
  assert.throws(() => AF.exchange.reviewFunding({ strategy: 'factor', kind: 'deposit', amount: 1 }), /Pass/);
  const first = AF.exchange.reviewFunding({ strategy: 'trend', kind: 'deposit', amount: 10 });
  const stale = AF.exchange.reviewFunding({ strategy: 'trend', kind: 'deposit', amount: 10 });
  AF.exchange.executeFunding(first);
  assert.throws(() => AF.exchange.executeFunding(stale), /changed/);
  const expired = AF.exchange.reviewFunding({ strategy: 'trend', kind: 'withdraw', amount: 1 }, 1000);
  assert.throws(() => AF.exchange.executeFunding(expired, 31000), /expired/);
  const changed = AF.exchange.reviewFunding({ strategy: 'trend', kind: 'withdraw', amount: 1 });
  saved.delete('alphaforge.passmarket.xlayer-preview.v1');
  assert.throws(() => AF.exchange.executeFunding(changed), /unreadable|changed/);
  const { AF: failed } = prototype({ preview: true, connected: true });
  const old = failed.exchange.read();
  const review = failed.exchange.reviewFunding({ strategy: 'trend', kind: 'deposit', amount: 1 });
  assert.throws(() => failed.exchange.executeFunding(structuredClone(review)), /Review/);
  assert.deepEqual(failed.exchange.read(), old);
  const blocked = prototype({ preview: true, connected: true, failWrites: true }).AF;
  const unchanged = blocked.exchange.read();
  assert.throws(
    () =>
      blocked.exchange.executeFunding(
        blocked.exchange.reviewFunding({ strategy: 'trend', kind: 'deposit', amount: 1 }),
      ),
    /could not be saved/,
  );
  assert.deepEqual(blocked.exchange.read(), unchanged);
});

test('public and legacy modes cannot call preview funding', () => {
  for (const options of [{ publicMode: true, preview: true }, {}]) {
    const { AF, touched } = prototype(options);
    assert.throws(
      () => AF.exchange.reviewFunding({ strategy: 'trend', kind: 'deposit', amount: 1 }),
      /LOCAL_FINANCE_DISABLED/,
    );
    assert.throws(() => AF.exchange.executeFunding({}), /LOCAL_FINANCE_DISABLED/);
    assert.equal(touched.filter(([kind]) => kind === 'write').length, 0);
  }
});

test('bounded funding history still permits withdrawal after the record limit and reload', () => {
  const saved = new Map();
  const { AF } = prototype({ preview: true, connected: true, saved });
  AF.exchange.execute(AF.exchange.review({ strategy: 'factor', side: 'buy', qty: 1 }));
  for (let i = 0; i < 149; i++) {
    AF.exchange.executeFunding(AF.exchange.reviewFunding({ strategy: 'trend', kind: 'deposit', amount: 1 }));
    AF.exchange.executeFunding(AF.exchange.reviewFunding({ strategy: 'trend', kind: 'withdraw', amount: 1 }));
  }
  AF.exchange.executeFunding(AF.exchange.reviewFunding({ strategy: 'trend', kind: 'deposit', amount: 1 }));
  AF.exchange.executeFunding(AF.exchange.reviewFunding({ strategy: 'trend', kind: 'deposit', amount: 1 }));
  const atLimit = AF.exchange.read();
  assert.equal(atLimit.funding.allocations.trend, 2);
  assert.equal(atLimit.funding.history.length, 300);
  assert.equal(atLimit.orders.length, 1);
  const reloaded = prototype({ preview: true, connected: true, saved }).AF;
  reloaded.exchange.executeFunding(
    reloaded.exchange.reviewFunding({ strategy: 'trend', kind: 'withdraw', amount: 2 }),
  );
  const released = reloaded.exchange.read();
  assert.equal(released.funding.allocations.trend, 0);
  assert.equal(released.funding.history.length, 300);
  assert.equal(released.orders.length, 1);
  assert.ok(released.executed.includes(released.orders[0].id));
  assert.equal(
    released.cash + Object.values(released.positions).reduce((sum, position) => sum + position.cost, 0),
    released.initialCapital + released.realized,
  );
  assert.equal(released.funding.cash + released.funding.allocations.trend, released.funding.initialCapital);
  reloaded.exchange.review({ strategy: 'trend', side: 'sell', qty: 2 });
});

test('old preview OKB trade state upgrades without losing holdings or treating OKB allocations as USDT', () => {
  const saved = new Map();
  const { AF } = prototype({ preview: true, connected: true, saved });
  AF.exchange.execute(AF.exchange.review({ strategy: 'factor', side: 'buy', qty: 1 }));
  const old = AF.exchange.read();
  delete old.funding;
  old.allocations = Object.fromEntries(Object.keys(old.positions).map((id) => [id, 0]));
  old.allocations.trend = 50;
  old.cash -= 50;
  old.fundingHistory = [];
  saved.set('alphaforge.passmarket.xlayer-preview.v1', JSON.stringify(old));
  const upgraded = prototype({ preview: true, connected: true, saved }).AF.exchange.read();
  assert.equal(upgraded.cash, AF.exchange.read().cash);
  assert.equal(upgraded.positions.factor.qty, 1);
  assert.equal(upgraded.positions.trend.qty, 2);
  assert.equal(upgraded.legacyOkbFunding.refunded, 50);
  assert.equal(upgraded.funding.cash, 10_000_000_000);
  assert.equal(upgraded.funding.allocations.trend, 0);
});
