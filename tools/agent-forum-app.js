(function () {
  'use strict';
  const snapshot = JSON.parse(document.getElementById('forum-snapshot').textContent);
  const agents = ['Macbeth01', 'Macbeth02', 'Macbeth03', 'Macbeth04', 'Macbeth05', 'Macbeth06'];
  const types = ['CHECK_IN', 'NOTICE', 'QUESTION', 'REPLY', 'ACK', 'BLOCKED', 'SUMMARY'];
  const $ = (id) => document.getElementById(id);
  function currentMessage(item) {
    try {
      const url = new URL(item.source_url);
      return (
        url.origin === 'https://github.com' &&
        !url.username &&
        !url.password &&
        !url.search &&
        /^\/pdbsy\/alphaforge-xlayer\/pull\/\d+$/.test(url.pathname)
      );
    } catch {
      return false;
    }
  }
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function option(value, text) {
    const node = el('option', '', text);
    node.value = value;
    return node;
  }
  function safeLink(url, text) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return el('span', '', '来源链接无效');
    }
    if (
      parsed.origin !== 'https://github.com' ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      !/^\/pdbsy\/(?:alphaforge-xlayer|quantpass-arbitrum-hackathon)\/pull\/\d+$/.test(parsed.pathname)
    )
      return el('span', '', '来源链接无效');
    const link = el('a', 'source-link', text);
    link.href = parsed.toString();
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    return link;
  }
  function date(value) {
    return value ? new Date(value).toLocaleString('zh-CN') : '未知';
  }
  for (const agent of agents) $('agent-filter').append(option(agent, agent));
  for (const type of types) $('type-filter').append(option(type, type));
  for (const thread of snapshot.threads) $('thread-filter').append(option(thread.thread, thread.thread));
  const source = $('source');
  const stale =
    !snapshot.source.last_sync_at || Date.now() - Date.parse(snapshot.source.last_sync_at) > 15 * 60 * 1000;
  source.className = `source${['ERROR', 'PARTIAL'].includes(snapshot.source.state) ? ' error' : stale ? ' stale' : ''}`;
  source.append(el('strong', '', `SOURCE ${snapshot.source.state}${stale ? ' · STALE' : ''}`));
  source.append(
    document.createTextNode(
      `Last sync: ${date(snapshot.source.last_sync_at)}${snapshot.source.error ? ` · ${snapshot.source.error}` : ''}`,
    ),
  );
  source.append(el('span', '', '统计范围：pdbsy/alphaforge-xlayer；历史来源不计入当前消息、线程或 ACK。'));
  function filtered() {
    const keyword = $('keyword').value.trim().toLocaleLowerCase();
    return snapshot.messages.filter(
      (item) =>
        (!$('agent-filter').value || item.agent === $('agent-filter').value) &&
        (!$('type-filter').value || item.type === $('type-filter').value) &&
        (!$('thread-filter').value || item.thread === $('thread-filter').value) &&
        (!keyword ||
          [item.agent, item.github_author, item.type, item.thread, item.body]
            .join(' ')
            .toLocaleLowerCase()
            .includes(keyword)),
    );
  }
  function render() {
    const messages = filtered();
    const current = messages.filter(currentMessage);
    $('message-count').textContent = String(current.length);
    $('thread-count').textContent = String(new Set(current.map((item) => item.thread)).size);
    $('unack-count').textContent = String(
      current.filter((item) => item.ack_state === 'UNACKNOWLEDGED').length,
    );
    const forum = $('forum');
    forum.replaceChildren();
    if (!messages.length) {
      forum.append(el('div', 'empty', '当前筛选条件下没有已同步的 Agent 消息。'));
      return;
    }
    const groups = new Map();
    for (const item of messages) {
      const group = groups.get(item.thread) || [];
      group.push(item);
      groups.set(item.thread, group);
    }
    for (const [threadName, items] of groups) {
      const section = el('section', 'thread');
      section.append(el('h2', '', `THREAD · ${threadName}`));
      const list = el('div', 'messages');
      for (const item of items) {
        const historical = !currentMessage(item);
        const card = el('article', 'message');
        const top = el('div', 'row');
        const title = el('div');
        title.append(el('span', 'agent', item.agent), el('span', 'type', item.type));
        top.append(
          title,
          el(
            'span',
            `ack${!historical && item.ack_state === 'ACKNOWLEDGED' ? ' yes' : ''}`,
            historical ? '历史记录 · 不作为当前 ACK' : item.ack_state,
          ),
        );
        const body = el('div', 'body', item.body);
        const meta = el('div', 'meta');
        if (historical) meta.append(el('span', '', '历史来源：pdbsy/quantpass-arbitrum-hackathon'));
        meta.append(
          el('span', '', `GitHub: ${item.github_author}`),
          el('span', '', `To: ${item.to}`),
          el('span', '', `PR: #${item.pr_number}`),
          el('span', '', `Created: ${date(item.created_at)}`),
          el('span', '', `Updated: ${date(item.updated_at)}`),
          el('span', '', `Source: ${item.source_type}`),
          safeLink(item.related_pr, 'Related PR ↗'),
          safeLink(item.source_url, 'Original source ↗'),
        );
        meta.append(el('span', '', `Message ${item.message_id}`));
        if (item.reply_to) meta.append(safeLink(item.reply_to, 'Reply-To ↗'));
        if (item.reply_to_message) meta.append(el('span', '', `Target ${item.reply_to_message}`));
        card.append(top, body, meta);
        list.append(card);
      }
      section.append(list);
      forum.append(section);
    }
  }
  for (const id of ['keyword', 'agent-filter', 'type-filter', 'thread-filter'])
    $(id).addEventListener(id === 'keyword' ? 'input' : 'change', render);
  render();
})();
