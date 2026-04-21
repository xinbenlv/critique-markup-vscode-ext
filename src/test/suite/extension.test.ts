import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';

suite('extension integration', () => {
  const fixturePath = path.join(
    vscode.workspace.workspaceFolders?.[0].uri.fsPath ?? path.resolve(__dirname, '../../../../test-fixtures'),
    'review.md'
  );

  async function openFixture(): Promise<vscode.TextEditor> {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.file(fixturePath));
    const editor = await vscode.window.showTextDocument(document);
    await new Promise((resolve) => setTimeout(resolve, 150));
    return editor;
  }

  test('provides accept and reject code lenses for critic markup', async () => {
    const editor = await openFixture();
    const codeLenses = (await vscode.commands.executeCommand(
      'vscode.executeCodeLensProvider',
      editor.document.uri,
      20
    )) as vscode.CodeLens[];

    const titles = codeLenses.map((lens) => lens.command?.title).filter(Boolean);

    assert.ok(titles.includes('Accept'));
    assert.ok(titles.includes('Reject'));
  });

  test('provides hover bubble content with review actions', async () => {
    const editor = await openFixture();
    const hoverPosition = new vscode.Position(3, 35);
    const hovers = (await vscode.commands.executeCommand(
      'vscode.executeHoverProvider',
      editor.document.uri,
      hoverPosition
    )) as vscode.Hover[];

    const hoverText = hovers
      .flatMap((hover) => hover.contents)
      .map((content) => (content instanceof vscode.MarkdownString ? content.value : String(content)))
      .join('\n');

    assert.match(hoverText, /Need better rollback notes/);
    assert.match(hoverText, /Accept/);
    assert.match(hoverText, /Reject/);
  });

  test('wrap commands can run without prompts when args are supplied', async () => {
    const substituteDocument = await vscode.workspace.openTextDocument({ language: 'markdown', content: 'polling' });
    const substituteEditor = await vscode.window.showTextDocument(substituteDocument);
    substituteEditor.selection = new vscode.Selection(0, 0, 0, substituteDocument.getText().length);

    await vscode.commands.executeCommand('critiqueMarkup.substitute', { replacement: 'webhooks' });
    assert.equal(substituteEditor.document.getText(), '{~~polling~>webhooks~~}');

    const commentDocument = await vscode.workspace.openTextDocument({ language: 'markdown', content: 'polling' });
    const commentEditor = await vscode.window.showTextDocument(commentDocument);
    commentEditor.selection = new vscode.Selection(0, 0, 0, commentDocument.getText().length);

    await vscode.commands.executeCommand('critiqueMarkup.commentOver', { comment: 'Need rollback notes' });
    assert.equal(commentEditor.document.getText(), '{==polling==}{>>Need rollback notes<<}');
  });

  test('accept command edits the underlying document', async () => {
    const editor = await openFixture();
    const codeLenses = (await vscode.commands.executeCommand(
      'vscode.executeCodeLensProvider',
      editor.document.uri,
      20
    )) as vscode.CodeLens[];

    const acceptLens = codeLenses.find((lens) => lens.command?.title === 'Accept');
    assert.ok(acceptLens?.command, 'expected at least one Accept code lens');

    await vscode.commands.executeCommand(
      acceptLens!.command!.command,
      ...(acceptLens!.command!.arguments ?? [])
    );

    assert.match(editor.document.getText(), /Ship new cache before launch\./);
  });
});
