# Changelog

## 2.0.2

### Highlights

- Rename the extension presentation to **Critque Markup for Markdown Comments**.
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
