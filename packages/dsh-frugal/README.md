# dsh-frugal

An always-on **token discipline** bundle for DeepSeek Harness. It changes no business logic: on every prompt assembly it appends one `systemPrompt` section.

## What the section says

1. **Reply length** — `replyMaxLines` (default 12), conclusion first, no restating tool output, no step-by-step narration.
2. **Screenshot budget** — `imageBudget` (default 2 per turn); consult the cached coordinate sheet before taking a new screenshot.
3. **Cached coordinates** — a small text table of UI hit points, so repeated lookups cost a few hundred tokens instead of a ~2.6k-token image.

## Configuration

Set these on the bundle row in the profile patch:

| Field | Default | Meaning |
|---|---|---|
| `enabled` | `true` | Skip the whole section when `false` |
| `replyMaxLines` | `12` | Soft cap on reply lines |
| `imageBudget` | `2` | Soft cap on screenshots per turn |
| `coords` | `''` | Extra coordinate notes, appended verbatim |

```yaml
- id: dsh-frugal
  name: '@local/dsh-frugal'
  config:
    replyMaxLines: 10
    imageBudget: 1
```

## Limitations

- This is a **prompt-layer** constraint, not runtime enforcement: it makes the model *want* to be brief but does not deny tool calls.
- Hard denial of over-budget screenshots and real image downscaling would need a `tools` interceptor plus an image library; not implemented here.
- The shipped coordinate sheet targets one game at 2560×1599. Override `coords` or set `enabled: false` for other work.

## Layout

```
index.js            # systemPrompt.section registration
cordis.patch.yml    # bundle patch (row id: dsh-frugal)
locale/{en,zh}.json # Plugin Manager title/description/detail
docs/DETAIL.md      # bundle detail page
icon.svg            # original icon
```
