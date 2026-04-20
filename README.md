# Critique Markup VS Code Extension

A VS Code extension for reviewing AI-generated coding plans in Markdown using **Critic Markup**, without forcing users into some bloated custom document viewer.

## Why this exists

AI can draft coding plans quickly. Reading, critiquing, and iterating on them is the annoying part.

The goal is to make Markdown plans feel closer to a Google Docs review workflow while staying native to VS Code and compatible with normal Markdown editing.

Instead of inventing a whole new rich-text layer, this extension focuses on **Critic Markup** as the review protocol:

- additions
- deletions
- substitutions
- comments / comment-over review flows

## Product requirements

### Core positioning

- Work with existing Markdown files.
- Integrate with the normal VS Code editing / Markdown workflow.
- **Do not** require a separate heavyweight custom document view like `markdown-docs`.
- Be composable, fast, and readable.

### Review markup format

Use **Critic Markup** as the source-of-truth review syntax.

Reference:
- https://github.com/CriticMarkup/CriticMarkup-toolkit

### UI rendering spec

Render Critic Markup semantics directly inside the editor with clear visual treatment:

1. **Comment-over / review target text**
   - yellow background
   - 50% opacity

2. **Deletion or substituted-away text**
   - red background
   - 50% opacity
   - strikethrough

3. **Addition or substituted-in text**
   - green background
   - 50% opacity

The point is not vague highlighting. Each review state should be visually distinct at a glance.

### Editing commands

Provide one VS Code command for each editing action, each designed to work on the current selection:

- `Critique Markup: Add`
- `Critique Markup: Delete`
- `Critique Markup: Substitute`
- `Critique Markup: Comment Over`

Requirements:
- each command should support a keyboard shortcut
- commands should insert or wrap the current selection with the correct Critic Markup syntax
- users should not need to hand-write the syntax manually

### Comment bubble display

Comments should be displayed in **two forms**:

1. tooltip / inline bubble over or near the marked text
2. gutter bubble in the editor margin

Each bubble should support:
- `Accept`
- `Reject`

Those actions must edit the underlying document content.

### Visual regression testing

Automate visual verification instead of relying on vibes.

Requirements:
- launch a test/dev instance of VS Code
- load a minimal fixture Markdown file
- capture screenshots of key rendering states
- store those screenshots in the repo
- show the screenshots in this README

This matters because visual review tools rot fast when colors, decorations, or layouts drift.

## Competing / prior extensions

### 1. markdown-docs

Repo: https://github.com/jonnyasmar/markdown-docs

Why it is not the model to follow:
- creates its own separate view
- loads slowly
- pushes users toward its own rich content model
- poor composability with normal Markdown workflows

### 2. vscode-criticmarkup

Repo: https://github.com/jloow/vscode-criticmarkup

Notes:
- archived
- incomplete
- directionally relevant, but not production-ready

## Deliverables

This repo should grow into:

- a VS Code extension implementing Critic Markup review UX for Markdown plans
- clear rendering rules for additions / deletions / substitutions / comments
- editor commands for creating review markup
- accept / reject review actions
- automated visual regression screenshots
- README documentation with actual screenshots, not hand-wavy promises

## Screenshot requirements

This is non-negotiable. The README must eventually show screenshots for at least:

1. yellow comment-over highlight
2. red deletion highlight with strikethrough
3. green addition highlight
4. substitution before/after rendering
5. tooltip bubble with `Accept` / `Reject`
6. gutter bubble rendering
7. dev/test instance visual regression output

Suggested screenshot paths:

- `assets/screenshots/comment-over.png`
- `assets/screenshots/delete.png`
- `assets/screenshots/add.png`
- `assets/screenshots/substitute.png`
- `assets/screenshots/tooltip-bubble.png`
- `assets/screenshots/gutter-bubble.png`
- `assets/screenshots/visual-regression.png`

## Planned architecture

### MVP

- parse Critic Markup ranges from Markdown text
- decorate ranges with VS Code `TextEditorDecorationType`
- register editing commands
- show hover UI for comment context
- expose accept/reject actions as commands

### Next

- gutter decorations and clickable review affordances
- screenshot automation for regression coverage
- richer command UX for substitutions and comment threading

## Development notes

### Example Critic Markup syntax

```md
Normal text before.

This is {++added text++}.
This is {--deleted text--}.
This is {~~old text~>new text~~}.
This is {>>A review comment<<}commented text.
```

### Suggested repo layout

```text
src/
  extension.ts
  criticMarkup/
  decorations/
  commands/
  ui/
assets/
  screenshots/
examples/
  sample-plan.md
```

## Status

Initial repo scaffold only. Real screenshots still need to be generated once the extension renders actual UI.
