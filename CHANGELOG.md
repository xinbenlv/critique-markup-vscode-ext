# Changelog

## 2.0.3

### Highlights

- Add selection-aware editor right-click commands:
  - **Comment Over**, **Delete**, and **Substitute** appear when text is selected.
  - **Add** appears when no text is selected.
- Replace the top-edge VS Code input strip with a centered in-editor prompt dialog for comment-over and substitute flows.
- Refresh README screenshots and the overview GIF for the new review states.

### Implementation updates

- Add regression tests for context-menu contributions and centered dialog layout.
- Add a dedicated accepted-edit fixture for visual regression coverage.
- Fix the dual-market publish script's missing-env error output before packaging and release.

## 2.0.2

### Highlights

- Rename the extension presentation to **Critique Markup for Markdown Comments**.
- Reposition the extension around Markdown comments, suggested edits, Microsoft Word–style revisions/redlining, and GitHub-style inline review.
- Fix comment-over syntax to use `{==highlighted content==}{>>comment<<}`.

### Implementation updates

- Update parser, rendering, fixtures, examples, and tests for the corrected comment-over format.
- Regenerate README visuals with a new full-window overview GIF and dedicated screenshots for:
  - full feature view
  - adding comment-over
  - accepting edits
- Tighten the visual regression generator to avoid flaky UI toggles during screenshot capture.
- Fix publish documentation to use exported `~/.env` loading instead of the broken plain `source ~/.env && ...` advice.
