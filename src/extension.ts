import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext): void {
  const wrapSelection = (prefix: string, suffix: string, placeholder = 'text') => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      void vscode.window.showWarningMessage('Open a Markdown editor first.');
      return;
    }

    void editor.edit((editBuilder) => {
      for (const selection of editor.selections) {
        const selectedText = editor.document.getText(selection) || placeholder;
        editBuilder.replace(selection, `${prefix}${selectedText}${suffix}`);
      }
    });
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('critiqueMarkup.add', () => {
      wrapSelection('{++', '++}', 'added text');
    }),
    vscode.commands.registerCommand('critiqueMarkup.delete', () => {
      wrapSelection('{--', '--}', 'deleted text');
    }),
    vscode.commands.registerCommand('critiqueMarkup.substitute', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        void vscode.window.showWarningMessage('Open a Markdown editor first.');
        return;
      }

      const replacement = await vscode.window.showInputBox({
        prompt: 'Replacement text for the current selection',
        placeHolder: 'new text',
      });

      if (replacement === undefined) {
        return;
      }

      void editor.edit((editBuilder) => {
        for (const selection of editor.selections) {
          const selectedText = editor.document.getText(selection) || 'old text';
          editBuilder.replace(selection, `{~~${selectedText}~>${replacement || 'new text'}~~}`);
        }
      });
    }),
    vscode.commands.registerCommand('critiqueMarkup.commentOver', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        void vscode.window.showWarningMessage('Open a Markdown editor first.');
        return;
      }

      const comment = await vscode.window.showInputBox({
        prompt: 'Review comment',
        placeHolder: 'Explain the critique',
      });

      if (comment === undefined) {
        return;
      }

      void editor.edit((editBuilder) => {
        for (const selection of editor.selections) {
          const selectedText = editor.document.getText(selection) || 'commented text';
          editBuilder.replace(selection, `{>>${comment || 'Review comment'}<<}${selectedText}`);
        }
      });
    })
  );

  void vscode.window.showInformationMessage('Critique Markup scaffold activated.');
}

export function deactivate(): void {}
