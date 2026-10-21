import assert from 'node:assert/strict';
import { test } from 'node:test';
import extension from '../index.ts';

// Single approved seam: registered message_end handler, never private helpers.
let complete;
extension({ on(event, handler) { assert.equal(event, 'message_end'); complete = handler; } });
const message = text => ({ role: 'assistant', content: [{ type: 'text', text }], timestamp: 123 });
async function output(text, cwd = '/workspace/project', context = {}) {
  const original = message(text);
  const result = await complete({ type: 'message_end', message: original }, { cwd, ...context });
  return (result?.message ?? original).content[0].text;
}

const link = (label, destination) => `${label} ${destination}`;

test('Color only displayed destinations with mdCode in TUI mode', async () => {
  const calls = [];
  const color = text => `\u001b[35m${text}\u001b[39m`;
  const context = { mode: 'tui', ui: { theme: { fg(token, text) {
    calls.push([token, text]);
    return color(text);
  } } } };
  assert.equal(await output('- [Spec](./SPEC.md)\n- [Site](https://example.com)', '/workspace/project', context),
    `- ${color('Spec')} ${color('file:///workspace/project/SPEC.md')}\n- ${color('Site')} ${color('https://example.com')}`);
  assert.deepEqual(calls, [['mdHeading', 'Spec'], ['mdCode', 'file:///workspace/project/SPEC.md'], ['mdHeading', 'Site'], ['mdCode', 'https://example.com']]);
  assert.equal(await output('![Photo](./photo.png)', '/workspace/project', context),
    `![Photo](file:///workspace/project/photo.png)\n\n${color('file:///workspace/project/photo.png')}`);
});

for (const mode of ['print', 'json', 'rpc']) {
  test(`Show inline destinations in ${mode} mode`, async () => {
    assert.equal(await output('[API](https://example.com "Title")', '/workspace/project', { mode }), link('API', 'https://example.com'));
  });
}

test('Convert relative and absolute paths: parent and absolute links', async () => {
  assert.equal(await output('[Parent](../README.md) [Log](/tmp/app.log)'), `${link('Parent', 'file:///workspace/README.md')} ${link('Log', 'file:///tmp/app.log')}`);
});

const cases = [
  ['Convert both untitled local image destinations', '![Photo](./photo.png)', '![Photo](file:///workspace/project/photo.png)\n\nfile:///workspace/project/photo.png'],
  ['Convert both image destinations', '![Photo](./photo.png "Photo title")', '![Photo](file:///workspace/project/photo.png)\n\nfile:///workspace/project/photo.png'],
  ['Preserve link labels and discard optional titles', '[Source](./index.ts "Source file")', link('Source', 'file:///workspace/project/index.ts')],
  ['Convert nonexistent targets', '[Missing](./missing.txt)', link('Missing', 'file:///workspace/project/missing.txt')],
  ['Encode literal filename characters', '[Notes](./notes#draft?.md)', link('Notes', 'file:///workspace/project/notes%23draft%3F.md')],
  ['Format multiple occurrences', 'Before [A](./a.ts) and [B](/tmp/b.ts). After', `Before ${link('A', 'file:///workspace/project/a.ts')} and ${link('B', 'file:///tmp/b.ts')}. After`],
  ['Continue conversion inside inline code', '`[Source](./index.ts)`', `\`${link('Source', 'file:///workspace/project/index.ts')}\``],
  ['Preserve links inside fenced code', '```\n[Source](./index.ts)\n```', '```\n[Source](./index.ts)\n```'],
  ['Preserve partial matching of parentheses', '![Photo](./a(b).png)', '![Photo](file:///workspace/project/a(b)\n\nfile:///workspace/project/a(b.png)'],
  ['Partially rewrite a parenthesized link destination', '[Example](https://example.com/a(b))', 'Example https://example.com/a(b)'],
  ['Rewrite a backslash-prefixed link', '\\[Source](./index.ts)', `\\${link('Source', 'file:///workspace/project/index.ts')}`],
  ['Remove a link optional title', '[Example](https://example.com "Site title")', link('Example', 'https://example.com')],
  ['Append an image destination', '![Photo](https://example.com/photo.png)', '![Photo](https://example.com/photo.png)\n\nhttps://example.com/photo.png'],
  ['Preserve excluded image destinations', '![Photo](//example.com/photo.png)', '![Photo](//example.com/photo.png)\n\n//example.com/photo.png'],
];
for (const [name, input, expected] of cases) test(name, async () => assert.equal(await output(input), expected));

for (const destination of ['index.ts', 'src/index.ts', '~/file', '$HOME/file', 'C:/work/file.txt', 'C:\\work\\file.txt', '//example.com/photo.png', 'https://example.com', 'file:///tmp/app.log', 'mailto:person@example.com', '#section', '?page=2']) {
  test(`Leave excluded destinations unconverted: ${destination}`, async () => {
    assert.equal(await output(`[Label](${destination})`), link('Label', destination));
  });
}

for (const text of ['[](./index.ts)', '![](./photo.png)', '[Source]()', '[Source](./my file.ts)', '[Outer [Inner]](./index.ts)', '[Source][source]\n[source]: index.ts\n<https://example.com>']) {
  test(`Preserve recognition restrictions and ordinary text: ${text}`, async () => {
    assert.equal(await complete({ message: message(text) }, { cwd: '/workspace/project' }), undefined);
  });
}

test('Preserve standalone paths, including inline code, without coloring', async () => {
  const context = { mode: 'tui', ui: { theme: { fg() {
    assert.fail('Standalone paths must not be colored');
  } } } };
  for (const input of [
    'Edit /Users/vatikiot/devel/code/my-network/synapse-data/homeserver.yaml:',
    '- Main guide: /opt/pi/README.md\n- Docs: `/opt/pi/docs/`',
    'Read /tmp/app.log, then https://example.com/a and file:///tmp/existing.',
    'Read `/tmp/my file.md`.',
    'Read ./index.ts or ../README.md.',
    'Docs: ./docs/\nParent: `../my file.md`',
  ]) assert.equal(await output(input, '/workspace/project', context), input);
});

test('Preserve fenced blocks including path-only and unclosed blocks', async () => {
  for (const input of [
    'Before\n```text\n/tmp/my file.md\n```\nAfter',
    '~~~\n./docs/\n~~~',
    '```\n../SPEC.md\n```',
    '```sh\ncat ./SPEC.md\n```',
    '```md\n![Photo](./photo.png)\n[Site](https://example.com)\n```',
    '````\n```\n/tmp/file\n````',
    '~~~\n```\n/tmp/file\n~~~',
    '  ```text\r\n/tmp/file\r\n  ````\r\n',
    '```\n/tmp/file',
  ]) assert.equal(await output(input), input);
});

test('Retain fences around actual code', async () => {
  const input = '```sh\ncat ./SPEC.md\n```';
  assert.equal(await output(input), input);
  assert.equal(await output(`[Before](./before)\n${input}\n[After](./after)`),
    `Before file:///workspace/project/before\n${input}\nAfter file:///workspace/project/after`);
});

test('Do not partially convert home-directory paths', async () => {
  assert.equal(await output('~/.config/herdr/config.toml'), '~/.config/herdr/config.toml');
  assert.equal(await output('`~/.config/herdr/config.toml`'), '`~/.config/herdr/config.toml`');
});

test('Preserve line breaks already present around links', async () => {
  const input = '- [Installation](https://example.com/install)\n- [Remote access and Tailscale](https://example.com/remote)\n- [Background service](https://example.com/service)';
  const expected = `- ${link('Installation', 'https://example.com/install')}\n- ${link('Remote access and Tailscale', 'https://example.com/remote')}\n- ${link('Background service', 'https://example.com/service')}`;
  assert.equal(await output(input), expected);
});

test('Use Pi current working directory at each completion', async () => {
  assert.equal(await output('[Source](./index.ts)'), link('Source', 'file:///workspace/project/index.ts'));
  assert.equal(await output('[Source](./index.ts)', '/workspace/other'), link('Source', 'file:///workspace/other/index.ts'));
});
test('Encode spaces introduced by the working directory', async () => {
  assert.equal(await output('[Source](./index.ts)', '/workspace/my project'), link('Source', 'file:///workspace/my%20project/index.ts'));
});
test('Preserve unaffected content, metadata, and order', async () => {
  const original = { ...message('unused'), content: [{ type: 'text', text: 'ordinary text', marker: 1 }, { type: 'text', text: '[Source](./index.ts)', marker: 2 }, { type: 'thinking', thinking: 'private', thinkingSignature: 'signature' }, { type: 'toolCall', id: 'id', name: 'read', arguments: { path: 'x' } }] };
  const before = structuredClone(original);
  const result = await complete({ message: original }, { cwd: '/workspace/project' });
  const expected = structuredClone(original);
  expected.content[1].text = link('Source', 'file:///workspace/project/index.ts');
  assert.deepEqual(result.message, expected);
  assert.deepEqual(original, before);
});
test('Preserve role boundaries', async () => {
  for (const role of ['user', 'toolResult', 'custom']) assert.equal(await complete({ message: { ...message('[Source](./index.ts)'), role } }, { cwd: '/workspace/project' }), undefined);
});
test('Keep text blocks separate', async () => {
  assert.equal(await complete({ message: { role: 'assistant', content: [{ type: 'text', text: '[Source]' }, { type: 'text', text: '(./index.ts)' }] } }, { cwd: '/workspace/project' }), undefined);
});

test('Convert relative and absolute paths: relative link', async () => {
  assert.equal(await output('[Source](./src/index.ts)'), link('Source', 'file:///workspace/project/src/index.ts'));
});
