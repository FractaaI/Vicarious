# DESIGN.md

# Vicarious Design Guide

```yaml
app:
  personality: quiet, focused, literary, desktop-native
  primary_task: write and revise visual novel dialogue
  layout: left scene rail, center script editor, right live preview, bottom character rail
  density: medium
  motion: subtle, functional, brief

color:
  light:
    canvas: "#F2F2EF"
    panel: "#FAFAF8"
    text: "#1C1917"
    muted: stone-400/500
    border: stone-100/200
  dark:
    canvas: "#2A2A2A"
    panel: "#303030"
    text: "#D6D3D1"
    muted: zinc-400/500
    border: white/5 to white/10
  semantic:
    danger: red-500
    primary_action_light: stone-700
    primary_action_dark: white

type:
  sans: Inter
  serif: Source Serif 4
  mono: IBM Plex Mono
  app_title: serif italic
  scene_headers: serif italic uppercase
  metadata: mono uppercase
  body: sans regular

shape:
  controls: 6px to 8px radius
  modals: 8px to 16px radius
  chat_bubbles: 12px radius with one tighter speaker corner
  swatches: circular

interaction:
  editing: keyboard-first
  file_flows: native menu and native dialogs
  persistence: explicit save plus separate recovery autosave
  feedback: restrained status text, dirty marker, focused-line preview emphasis
```

## Rationale

Vicarious should feel like a focused writing desk, not a dashboard or a marketing
site. The core surface is the script itself, supported by scene navigation,
character controls, and a live conversation preview. Visual styling should stay
quiet enough for long writing sessions while still making speakers, scenes, and
file state easy to scan.

The current UI uses warm neutral light surfaces and soft dark-mode grays,
balanced by character colors in the preview and footer controls. Keep that
neutral base. Character color is functional identity, not decoration.

Typography separates modes of thought: sans for writing, serif italic for title
and scene markers, and mono uppercase for metadata and labels. Preserve this
hierarchy when adding new controls or panels.

Prefer dense but calm desktop UI. Avoid landing-page patterns, oversized hero
sections, nested cards, decorative gradients, or explanatory in-app copy. New
features should appear as direct controls, menu actions, dialogs, or focused
panels that support writing.

## Direction

- Keep the first screen the editor itself.
- Preserve the three-pane writing/preview relationship unless a feature directly
  improves the writing workflow.
- Use native desktop affordances for file and app-level actions.
- Keep modal copy short and action-oriented.
- Use icons where the current UI already does, especially for compact repeated
  controls.
- Keep accessibility and legibility ahead of atmosphere: sufficient contrast,
  stable layout, clear focus, and no overlapping text.
- Treat animation as confirmation or spatial continuity, not ornament.

