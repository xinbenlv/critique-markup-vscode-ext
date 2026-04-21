import * as path from 'path';
import * as vscode from 'vscode';

import {
  applyReviewAction,
  findTokenByStart,
  getTokenPresentation,
  parseCriticMarkup,
  ReviewAction,
  WrapCommand,
  wrapSelectionText,
} from './criticMarkup';

import { showPromptDialog } from './promptDialog';

interface WrapCommandArgs {
  replacement?: string;
  comment?: string;
}

interface ReviewCommandArgs {
  uri: string;
  start: number;
}

class CritiqueMarkupController implements vscode.CodeLensProvider, vscode.HoverProvider {
  private readonly codeLensEmitter = new vscode.EventEmitter<void>();

  readonly onDidChangeCodeLenses = this.codeLensEmitter.event;

  private readonly additionDecoration = vscode.window.createTextEditorDecorationType({
    backgroundColor: 'rgba(39, 174, 96, 0.5)',
    borderRadius: '3px',
  });

  private readonly deletionDecoration = vscode.window.createTextEditorDecorationType({
    backgroundColor: 'rgba(235, 87, 87, 0.5)',
    borderRadius: '3px',
    textDecoration: 'line-through',
  });

  private readonly commentDecoration = vscode.window.createTextEditorDecorationType({
    backgroundColor: 'rgba(242, 201, 76, 0.5)',
    borderRadius: '3px',
  });

  private readonly gutterDecoration = vscode.window.createTextEditorDecorationType({
    gutterIconPath: vscode.Uri.file(path.resolve(__dirname, '../assets/icons/comment-gutter.svg')),
    gutterIconSize: 'contain',
  });

  private readonly bubbleDecoration = vscode.window.createTextEditorDecorationType({
    after: {
      margin: '0 0 0 0.75rem',
      color: '#d4b44c',
      backgroundColor: 'rgba(242, 201, 76, 0.18)',
      border: '1px solid rgba(242, 201, 76, 0.7)',
    },
  });

  dispose(): void {
    this.codeLensEmitter.dispose();
    this.additionDecoration.dispose();
    this.deletionDecoration.dispose();
    this.commentDecoration.dispose();
    this.gutterDecoration.dispose();
    this.bubbleDecoration.dispose();
  }

  refreshVisibleEditors(): void {
    for (const editor of vscode.window.visibleTextEditors) {
      this.refreshEditor(editor);
    }

    this.codeLensEmitter.fire();
  }

  refreshEditor(editor: vscode.TextEditor): void {
    if (editor.document.languageId !== 'markdown') {
      return;
    }

    const additionRanges: vscode.Range[] = [];
    const deletionRanges: vscode.Range[] = [];
    const commentRanges: vscode.Range[] = [];
    const gutterRanges: vscode.Range[] = [];
    const bubbleOptions: vscode.DecorationOptions[] = [];

    for (const token of parseCriticMarkup(editor.document.getText())) {
      const presentation = getTokenPresentation(token);
      const toRange = (start: number, end: number) =>
        new vscode.Range(editor.document.positionAt(start), editor.document.positionAt(end));

      switch (token.kind) {
        case 'addition':
          additionRanges.push(toRange(presentation.primaryRange.start, presentation.primaryRange.end));
          break;
        case 'deletion':
          deletionRanges.push(toRange(presentation.primaryRange.start, presentation.primaryRange.end));
          break;
        case 'substitution':
          if (presentation.oldRange) {
            deletionRanges.push(toRange(presentation.oldRange.start, presentation.oldRange.end));
          }
          if (presentation.newRange) {
            additionRanges.push(toRange(presentation.newRange.start, presentation.newRange.end));
          }
          break;
        case 'comment': {
          if (presentation.targetRange) {
            const targetRange = toRange(presentation.targetRange.start, presentation.targetRange.end);
            commentRanges.push(targetRange);
            gutterRanges.push(targetRange);
            bubbleOptions.push({
              range: new vscode.Range(targetRange.end, targetRange.end),
              renderOptions: {
                after: {
                  contentText: ` ${presentation.inlineBubbleText ?? '💬 Comment'}`,
                },
              },
            });
          }
          break;
        }
      }
    }

    editor.setDecorations(this.additionDecoration, additionRanges);
    editor.setDecorations(this.deletionDecoration, deletionRanges);
    editor.setDecorations(this.commentDecoration, commentRanges);
    editor.setDecorations(this.gutterDecoration, gutterRanges);
    editor.setDecorations(this.bubbleDecoration, bubbleOptions);
  }

  provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
    if (document.languageId !== 'markdown') {
      return [];
    }

    return parseCriticMarkup(document.getText()).flatMap((token) => {
      const line = document.positionAt(token.start).line;
      const range = new vscode.Range(line, 0, line, 0);
      const baseArgs: ReviewCommandArgs = { uri: document.uri.toString(), start: token.start };

      return [
        new vscode.CodeLens(range, {
          title: 'Accept',
          command: 'critiqueMarkup.acceptReview',
          arguments: [baseArgs],
        }),
        new vscode.CodeLens(range, {
          title: 'Reject',
          command: 'critiqueMarkup.rejectReview',
          arguments: [baseArgs],
        }),
      ];
    });
  }

  provideHover(document: vscode.TextDocument, position: vscode.Position): vscode.Hover | undefined {
    if (document.languageId !== 'markdown') {
      return undefined;
    }

    const offset = document.offsetAt(position);
    const token = parseCriticMarkup(document.getText()).find((candidate) => {
      const presentation = getTokenPresentation(candidate);
      const ranges = [
        presentation.primaryRange,
        presentation.oldRange,
        presentation.newRange,
        presentation.targetRange,
        presentation.commentRange,
      ].filter(Boolean) as Array<{ start: number; end: number }>;
      return ranges.some((range) => offset >= range.start && offset <= range.end);
    });

    if (!token) {
      return undefined;
    }

    const payload: ReviewCommandArgs = { uri: document.uri.toString(), start: token.start };
    const acceptUri = this.makeCommandUri('critiqueMarkup.acceptReview', payload);
    const rejectUri = this.makeCommandUri('critiqueMarkup.rejectReview', payload);
    const markdown = new vscode.MarkdownString(undefined, true);
    markdown.isTrusted = true;

    markdown.appendMarkdown(`**${this.prettyKind(token.kind)}**  \n`);
    if (token.commentText) {
      markdown.appendMarkdown(`> ${token.commentText}  \n\n`);
    }
    if (token.kind === 'substitution') {
      markdown.appendMarkdown(`Replace **${token.text}** with **${token.replacementText ?? ''}**.  \n\n`);
    }
    markdown.appendMarkdown(`[Accept](${acceptUri}) · [Reject](${rejectUri})`);

    const range = new vscode.Range(document.positionAt(token.start), document.positionAt(token.end));
    return new vscode.Hover(markdown, range);
  }

  async applyReview(action: ReviewAction, args: ReviewCommandArgs): Promise<void> {
    const document = await vscode.workspace.openTextDocument(vscode.Uri.parse(args.uri));
    const editor = await vscode.window.showTextDocument(document);
    const token = findTokenByStart(document.getText(), args.start);

    if (!token) {
      return;
    }

    const result = applyReviewAction(document.getText(), token, action);
    const rawRange = new vscode.Range(document.positionAt(token.start), document.positionAt(token.end));

    await editor.edit((builder) => {
      builder.replace(rawRange, result.replacement);
    });

    this.refreshEditor(editor);
    this.codeLensEmitter.fire();
  }

  private makeCommandUri(command: string, payload: ReviewCommandArgs): vscode.Uri {
    return vscode.Uri.parse(`command:${command}?${encodeURIComponent(JSON.stringify([payload]))}`);
  }

  private prettyKind(kind: string): string {
    switch (kind) {
      case 'addition':
        return 'Addition';
      case 'deletion':
        return 'Deletion';
      case 'substitution':
        return 'Substitution';
      case 'comment':
        return 'Comment';
      default:
        return 'Review';
    }
  }
}

async function getPromptedValue(command: WrapCommand, args: WrapCommandArgs): Promise<WrapCommandArgs | undefined> {
  if (command === 'Substitute' && !args.replacement) {
    const replacement = await showPromptDialog({
      title: 'Substitute',
      prompt: 'Replacement text for the current selection',
      placeholder: 'new text',
      initialValue: '',
      confirmLabel: 'Apply substitution',
    });
    if (replacement === undefined) {
      return undefined;
    }
    return { ...args, replacement };
  }

  if (command === 'CommentOver' && !args.comment) {
    const comment = await showPromptDialog({
      title: 'Comment Over',
      prompt: 'Review comment',
      placeholder: 'Explain the critique',
      initialValue: '',
      confirmLabel: 'Apply comment',
    });
    if (comment === undefined) {
      return undefined;
    }
    return { ...args, comment };
  }

  return args;
}

async function wrapSelections(command: WrapCommand, args: WrapCommandArgs = {}): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'markdown') {
    await vscode.window.showWarningMessage('Open a Markdown editor first.');
    return;
  }

  const resolvedArgs = await getPromptedValue(command, args);
  if (!resolvedArgs) {
    return;
  }

  await editor.edit((editBuilder) => {
    for (const selection of editor.selections) {
      const selectedText = editor.document.getText(selection);
      const replacement = wrapSelectionText(command, selectedText, resolvedArgs);
      editBuilder.replace(selection, replacement);
    }
  });
}

export function activate(context: vscode.ExtensionContext): void {
  const controller = new CritiqueMarkupController();

  context.subscriptions.push(
    controller,
    vscode.languages.registerCodeLensProvider({ language: 'markdown' }, controller),
    vscode.languages.registerHoverProvider({ language: 'markdown' }, controller),
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) {
        controller.refreshEditor(editor);
      }
    }),
    vscode.window.onDidChangeVisibleTextEditors(() => controller.refreshVisibleEditors()),
    vscode.workspace.onDidChangeTextDocument((event) => {
      const editor = vscode.window.visibleTextEditors.find(
        (candidate) => candidate.document.uri.toString() === event.document.uri.toString()
      );
      if (editor) {
        controller.refreshEditor(editor);
      }
      controller.refreshVisibleEditors();
    }),
    vscode.commands.registerCommand('critiqueMarkup.add', (args?: WrapCommandArgs) => wrapSelections('Add', args)),
    vscode.commands.registerCommand('critiqueMarkup.delete', (args?: WrapCommandArgs) => wrapSelections('Delete', args)),
    vscode.commands.registerCommand('critiqueMarkup.substitute', (args?: WrapCommandArgs) =>
      wrapSelections('Substitute', args)
    ),
    vscode.commands.registerCommand('critiqueMarkup.commentOver', (args?: WrapCommandArgs) =>
      wrapSelections('CommentOver', args)
    ),
    vscode.commands.registerCommand('critiqueMarkup.acceptReview', (args: ReviewCommandArgs) =>
      controller.applyReview('accept', args)
    ),
    vscode.commands.registerCommand('critiqueMarkup.rejectReview', (args: ReviewCommandArgs) =>
      controller.applyReview('reject', args)
    )
  );

  controller.refreshVisibleEditors();
}

export function deactivate(): void {}
