# Markdown link and image behavior

This is the authoritative behavioral specification. In examples, `\n` denotes a newline. The working directory is `/workspace/project` unless stated otherwise.

## Implemented behavior

### Journey: read labels and destinations together

As a Pi user, I want both a link's label and destination visible on the same line, including local file destinations.

#### Display web links inline

**Given** an assistant message contains `[Installation](https://example.com/install)`.
**When** the message finishes.
**Then** its text becomes `Installation https://example.com/install`.
**And** the extension adds no Markdown link delimiters.

#### Display local file links inline

**Given** an assistant message contains `[Source](./index.ts)`.
**When** the message finishes.
**Then** its text becomes `Source file:///workspace/project/index.ts`.

#### Preserve existing line breaks

**Given** an assistant message contains `- [A](https://example.com/a)\n- [B](./b.ts)`.
**When** the message finishes.
**Then** its text becomes `- A https://example.com/a\n- B file:///workspace/project/b.ts`.
**And** no new line breaks are introduced by link formatting.

#### Preserve surrounding content and remove optional titles

**Given** an assistant message contains `Before [A](./a.ts "Title") and [B](/tmp/b.ts). After`.
**When** the message finishes.
**Then** its text becomes `Before A file:///workspace/project/a.ts and B file:///tmp/b.ts. After`.

#### Color destinations in TUI mode

**Given** completion runs in TUI mode.
**When** a recognized link is rewritten.
**Then** its label (the descriptive text in square brackets) uses the active theme's `mdHeading` foreground color.
**And** its displayed destination uses only the active theme's `mdCode` foreground color, not `mdHeading`.
**And** any optional Markdown title remains discarded.
**And** this applies to all destinations, including web URLs and absolute file URLs.
**And** the label and destination are separated by one space with existing line breaks preserved.

#### Leave other modes uncolored

**Given** completion runs in print, JSON, or RPC mode.
**When** a link is rewritten.
**Then** its label and destination are separated by one space without added ANSI codes.

### Journey: resolve explicit filesystem destinations

#### Resolve paths against the current working directory

**Given** a recognized destination begins with `./`, `../`, or a single `/`.
**When** the assistant message finishes.
**Then** the destination becomes an encoded absolute `file:` URL using Pi's current working directory at that time.
**And** the target need not exist.

Examples: `../README.md` becomes `file:///workspace/README.md`; `/tmp/app.log` becomes `file:///tmp/app.log`; `./notes#draft?.md` becomes `file:///workspace/project/notes%23draft%3F.md`.

#### Encode working directory spaces

**Given** Pi's current working directory is `/workspace/my project`.
**When** a message containing `[Source](./index.ts)` finishes.
**Then** its text becomes `Source file:///workspace/my%20project/index.ts`.

#### Preserve other destinations

**Given** a recognized destination does not begin with `./`, `../`, or a single `/`.
**When** completion runs.
**Then** the destination text remains unchanged.

This includes bare filenames, `src/index.ts`, `~/file`, `$HOME/file`, Windows paths, `//example.com/photo.png`, existing `file:` URLs, web URLs, `mailto:` URLs, fragments, and queries. The extension does not open targets or guarantee terminal click behavior.

### Journey: preserve paths outside Markdown references

#### Preserve standalone paths

**Given** an assistant message contains standalone absolute or relative paths, either plain or inside inline code.
**When** the message finishes.
**Then** those paths remain unchanged, including punctuation and inline-code delimiters.
**And** no color is added to those paths in TUI mode.
**And** only destinations in recognized Markdown links and images are converted.

For example, `Edit /Users/vatikiot/devel/code/my-network/synapse-data/homeserver.yaml:` remains unchanged, as do `./docs/` and `../README.md`.

#### Preserve fenced code blocks

**Given** an assistant reply contains a backtick or tilde fenced code block, optionally with a language identifier.
**When** the message finishes.
**Then** the entire block remains unchanged, including its fences, paths, links, and images.
**And** this applies to blocks containing only one explicit path.
**And** rewriting outside the block continues normally.
**And** an unclosed block remains unchanged through the end of its text block.
**And** a closing fence must use the same character and at least as many characters as the opening fence, with only whitespace after it.
**And** indentation and existing line endings are preserved.

#### Preserve unsupported home-directory paths intact

**Given** an assistant reply contains `~/.config/herdr/config.toml`, either plain or inside inline code.
**When** the message finishes.
**Then** that path remains unchanged, including its `~` prefix.
**And** no partial `~file:` URL is produced.

### Journey: retain image references

#### Append image destinations

**Given** an assistant message contains `![Photo](./photo.png "Photo title")`.
**When** the message finishes.
**Then** its text becomes `![Photo](file:///workspace/project/photo.png)\n\nfile:///workspace/project/photo.png`.
**And** in TUI mode only the appended destination uses the active theme's `mdCode` foreground color.
**And** the image Markdown receives no ANSI codes.

The same presentation applies to non-filesystem image destinations without converting their destination text.

### Journey: preserve message boundaries

#### Preserve unrelated content

**Given** a completed assistant message contains text and non-text blocks.
**When** completion rewrites a recognized reference.
**Then** non-text blocks, block order, message metadata, and unrelated text remain unchanged.
**And** the original message object is not mutated.

#### Preserve role and text-block boundaries

**Given** a message is not from the assistant, or a reference is split between text blocks.
**When** completion runs.
**Then** the message or split reference remains unchanged.

### Known recognition limitations

#### Leave unsupported references unchanged

**Given** text contains empty labels or destinations, a destination containing spaces, `[Outer [Inner]](./index.ts)`, reference links, reference definitions, or autolinks.
**When** completion runs.
**Then** those references remain unchanged.
**And** all paths and URLs outside recognized Markdown links and images remain unchanged.

#### Rewrite inside inline code and after a backslash

**Given** a recognized reference occurs inside inline code or after a backslash, outside a fenced code block.
**When** completion runs.
**Then** it is still rewritten.
**And** existing code delimiters and the backslash remain.

#### Partially match parenthesized destinations

**Given** text contains `[Example](https://example.com/a(b))` or `![Photo](./a(b).png)`.
**When** completion runs.
**Then** the respective output is `Example https://example.com/a(b)` or `![Photo](file:///workspace/project/a(b)\n\nfile:///workspace/project/a(b.png)`.

Verification uses the registered completed-message handler with a minimal host. Live Pi rendering and terminal opening behavior are not verified by these tests.

## Approved, not implemented

None.

## Proposed

### Broader filesystem path support

Home-directory paths, environment-variable paths, and Windows paths remain unconverted. Recognition, expansion, platform behavior, and conversion rules remain undecided.

Open questions:
- Which home directory supplies `~`, and are named-user forms supported?
- Which environment and variable syntax apply, and what happens when a variable is missing?
- Which Windows forms are recognized, and on which host platforms?
