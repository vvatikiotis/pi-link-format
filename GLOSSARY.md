# Markdown Link Formatting

Vocabulary for Markdown links and images in assistant messages.

## Language

**Link**:
An inline Markdown reference consisting of a label and a destination, such as `[Source](./index.ts)`.
_Avoid_: URL (when referring to the entire link)

**Image**:
An inline Markdown image reference consisting of alternative text and a destination, such as `![Photo](./photo.png)`.
_Avoid_: Image file (when referring to the Markdown reference)

**Label**:
The descriptive text inside a link's square brackets, such as `Source` in `[Source](./index.ts)`.
_Avoid_: Title, URL

**Alternative text**:
The text inside an image's square brackets, intended to describe the image, such as `Photo` in `![Photo](./photo.png)`.
_Avoid_: Title, caption

**Destination**:
The target text inside a link's or image's parentheses, excluding any optional title. A destination can be a URL or a filesystem path; it need not be an existing or reachable resource.
_Avoid_: URL (when filesystem paths are also included)

**Explicit filesystem path**:
A filesystem path written with a relative-path marker, such as `./` or `../`, or as an absolute path, such as `/tmp/app.log`. A bare filename such as `index.ts` is not an explicit filesystem path.
_Avoid_: File URL

**Title**:
The optional descriptive text following a destination, such as `Source file` in `[Source](./index.ts "Source file")`; it is distinct from the label or alternative text.
_Avoid_: Label, alternative text
