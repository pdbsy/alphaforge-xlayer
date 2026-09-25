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

test('preview chart, ranking and executable Pass prices stay within 0.1 OKB including quote bound', () => {
  const { AF } = prototype({ preview: true, connected: true });
  for (const strategy of AF.strategies) {
    for (const range of ['24h', '7d', '30d', '90d']) {
      const bars = AF.marketData.candles(strategy.id, range);
      assert.ok(bars.length > 0);
      for (const bar of bars) {
        assert.ok(bar.low >= 0 && bar.high <= 10, `${strategy.id} chart exceeds 0.1 OKB`);
        assert.ok(bar.open <= 10 && bar.close <= 10);
      }
      const metric = AF.marketData.metrics(strategy.id, range);
      assert.ok(metric.price >= 3 && metric.price <= 10, `${strategy.id} metric exceeds 0.1 OKB`);
      assert.ok(metric.high <= 10);
    }
    for (const qty of [1, 2, 10, 1_000, 10_000]) {
      for (const side of ['buy', 'sell']) {
        const q = AF.exchange.quote({ strategy: strategy.id, side, qty, slippage: 300 });
        assert.ok(q.price <= 10);
        assert.ok(q.total > 0);
        assert.ok(q.bound <= qty * 10, `${strategy.id} ${side} bound exceeds 0.1 OKB per Pass`);
      }
    }
    assert.throws(
      () => AF.exchange.quote({ strategy: strategy.id, side: 'buy', qty: 1_000_000, slippage: 300 }),
      /price impact/,
    );
  }
  const ranking = AF.marketData.ranking({ mode: 'price' });
  assert.ok(ranking.every((row) => row.market.price <= 10));
});

test('preview buy and sell at capped prices preserve an older recorded cost basis', () => {
  const saved = new Map();
  const first = prototype({ preview: true, connected: true, saved }).AF;
  const old = first.exchange.read();
  old.positions.trend.cost = 500;
  old.initialCapital =
    old.cash + Object.values(old.positions).reduce((sum, position) => sum + position.cost, 0);
  saved.set('alphaforge.passmarket.xlayer-preview.v1', JSON.stringify(old));
  const { AF } = prototype({ preview: true, connected: true, saved });
  assert.equal(AF.exchange.read().positions.trend.cost, 500);
  const bought = AF.exchange.execute(AF.exchange.review({ strategy: 'factor', side: 'buy', qty: 1 }));
  assert.ok(bought.price <= 10);
  const sold = AF.exchange.execute(AF.exchange.review({ strategy: 'factor', side: 'sell', qty: 1 }));
  assert.ok(sold.price <= 10);
  const state = AF.exchange.read();
  assert.equal(state.positions.trend.cost, 500);
  assert.equal(
    state.cash + Object.values(state.positions).reduce((sum, position) => sum + position.cost, 0),
    state.initialCapital + state.realized,
  );
});

test('public and legacy fixture prices keep their existing economics', () => {
  const preview = prototype({ preview: true }).AF.marketData.metrics('trend').price;
  const legacy = prototype().AF.marketData.metrics('trend').price;
  const publicPrice = prototype({ publicMode: true, preview: true }).AF.marketData.metrics('trend').price;
  assert.ok(legacy > 10);
  assert.equal(publicPrice, legacy);
  assert.ok(preview <= 10);
});

test('preview prices retain strategy and candle variation after formatting', () => {
  const { AF } = prototype({ preview: true });
  const currentPrices = AF.strategies.map((strategy) => AF.marketData.metrics(strategy.id).price);
  assert.ok(new Set(currentPrices).size >= 3, 'strategies need distinguishable current prices');
  const rows = AF.marketData.candles('trend', '24h');
  const formatted = rows.flatMap((row) =>
    [row.open, row.high, row.low, row.close].map((value) => AF.marketData.fmt(value)),
  );
  assert.ok(new Set(formatted).size >= 4, 'OHLC labels need visible variation');
  assert.ok(
    formatted.some((value) => /^0\.\d{6}$/.test(value)),
    'small prices need six decimals',
  );
  const values = AF.marketData.candles('trend', '24h').map((row) => row.close);
  assert.ok(new Set(values.map((value) => AF.marketData.fmt(value))).size >= 4);
  assert.ok(AF.strategies.some((strategy) => Math.abs(AF.marketData.metrics(strategy.id).change) > 0.0001));
  assert.equal(AF.marketData.fmt(100000), '1,000.00');
});

test('preview executable close does not introduce a terminal candle jump', () => {
  const { AF } = prototype({ preview: true });
  for (const strategy of AF.strategies) {
    const rows = AF.marketData.candles(strategy.id, '90d');
    const last = rows.at(-1);
    assert.equal(last.close, Math.round(last.close), `${strategy.id} quote needs cent precision`);
    assert.ok(Math.abs(last.close - last.open) < 0.1, `${strategy.id} terminal body was distorted`);
    assert.ok(rows.every((row) => row.low > 0 && row.high <= 10), `${strategy.id} shifted path exceeds cap`);
  }
});
