import * as assert from 'assert';

import { buildPromptDialogHtml } from '../../promptDialog';

suite('prompt dialog html', () => {
  test('centers the dialog on screen instead of pinning it to the top edge', () => {
    const html = buildPromptDialogHtml({
      title: 'Comment Over',
      prompt: 'Review comment',
      placeholder: 'Explain the critique',
      initialValue: '',
      confirmLabel: 'Apply',
    });

    assert.match(html, /justify-content:\s*center/);
    assert.match(html, /align-items:\s*center/);
    assert.doesNotMatch(html, /align-items:\s*flex-start/);
  });
});
