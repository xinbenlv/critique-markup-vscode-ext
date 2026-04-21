import * as assert from 'assert';

import {
  applyReviewAction,
  parseCriticMarkup,
  wrapSelectionText,
} from '../../criticMarkup';

suite('critic markup parser', () => {
  test('parses additions deletions substitutions and comments', () => {
    const text = [
      'Ship {++new cache++} before launch.',
      'Drop {--legacy polling--} entirely.',
      'Use {~~polling~>events~~} for updates.',
      '{==Migration section==}{>>Need better rollback notes<<}',
    ].join('\n');

    const tokens = parseCriticMarkup(text);

    assert.equal(tokens.length, 4);
    assert.deepStrictEqual(
      tokens.map((token) => ({ kind: token.kind, text: token.text, comment: token.commentText })),
      [
        { kind: 'addition', text: 'new cache', comment: undefined },
        { kind: 'deletion', text: 'legacy polling', comment: undefined },
        { kind: 'substitution', text: 'polling', comment: undefined },
        { kind: 'comment', text: 'Migration section', comment: 'Need better rollback notes' },
      ]
    );
  });

  test('applies accept and reject correctly for every critic markup kind', () => {
    const addition = parseCriticMarkup('A {++better plan++}.')[0];
    assert.equal(applyReviewAction('A {++better plan++}.', addition, 'accept').text, 'A better plan.');
    assert.equal(applyReviewAction('A {++better plan++}.', addition, 'reject').text, 'A .');

    const deletion = parseCriticMarkup('A {--bad plan--}.')[0];
    assert.equal(applyReviewAction('A {--bad plan--}.', deletion, 'accept').text, 'A .');
    assert.equal(applyReviewAction('A {--bad plan--}.', deletion, 'reject').text, 'A bad plan.');

    const substitution = parseCriticMarkup('Use {~~old~>new~~} flow.')[0];
    assert.equal(applyReviewAction('Use {~~old~>new~~} flow.', substitution, 'accept').text, 'Use new flow.');
    assert.equal(applyReviewAction('Use {~~old~>new~~} flow.', substitution, 'reject').text, 'Use old flow.');

    const comment = parseCriticMarkup('{==Rollout plan==}{>>too vague<<}')[0];
    assert.equal(applyReviewAction('{==Rollout plan==}{>>too vague<<}', comment, 'accept').text, 'Rollout plan');
    assert.equal(applyReviewAction('{==Rollout plan==}{>>too vague<<}', comment, 'reject').text, '');
  });

  test('wrap selection helper creates expected critic markup syntax', () => {
    assert.equal(wrapSelectionText('Add', 'critical detail', {}), '{++critical detail++}');
    assert.equal(wrapSelectionText('Delete', 'legacy step', {}), '{--legacy step--}');
    assert.equal(
      wrapSelectionText('Substitute', 'polling', { replacement: 'webhooks' }),
      '{~~polling~>webhooks~~}'
    );
    assert.equal(
      wrapSelectionText('CommentOver', 'Migration section', { comment: 'Need rollback notes' }),
      '{==Migration section==}{>>Need rollback notes<<}'
    );
  });
});
