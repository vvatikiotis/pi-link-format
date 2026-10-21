# pi-link-format

A Pi extension that displays links as `Label destination` in completed assistant replies, with one space between them. This applies to web links and local file references. In TUI mode, destinations use the active theme's Markdown code color; link labels use its Markdown heading color. Markdown link and image destinations beginning with `./`, `../`, or a single `/` become absolute `file:` URLs using Pi's current working directory. Existing line breaks are preserved; no new line break is added to links. Optional Markdown titles are removed.

Standalone paths remain unchanged, including paths in inline code. Fenced code blocks remain unchanged, including blocks containing only a path. Images keep their Markdown and show their destination below it. Other destinations remain unchanged.

## Install

```bash
pi install git:github.com/vvatikiotis/link-format
```

To try it for one Pi invocation:

```bash
pi -e git:github.com/vvatikiotis/link-format
```
