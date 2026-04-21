import * as vscode from 'vscode';

export interface PromptDialogOptions {
  title: string;
  prompt: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildPromptDialogHtml(options: PromptDialogOptions): string {
  const title = escapeHtml(options.title);
  const prompt = escapeHtml(options.prompt);
  const placeholder = escapeHtml(options.placeholder ?? '');
  const initialValue = escapeHtml(options.initialValue ?? '');
  const confirmLabel = escapeHtml(options.confirmLabel ?? 'Apply');

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: var(--vscode-font-family, -apple-system, BlinkMacSystemFont, sans-serif);
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        padding: 24px;
        display: flex;
        justify-content: center;
        align-items: center;
        background: radial-gradient(circle at top, rgba(80, 86, 110, 0.35), transparent 45%),
          var(--vscode-editor-background);
        color: var(--vscode-editor-foreground);
      }

      .dialog-shell {
        width: min(520px, calc(100vw - 48px));
        border-radius: 16px;
        border: 1px solid var(--vscode-panel-border, rgba(255, 255, 255, 0.12));
        background: color-mix(in srgb, var(--vscode-editor-background) 88%, black);
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.45);
        overflow: hidden;
      }

      .dialog-body {
        padding: 24px;
      }

      h1 {
        margin: 0 0 10px;
        font-size: 20px;
        font-weight: 700;
      }

      p {
        margin: 0 0 16px;
        line-height: 1.5;
        color: var(--vscode-descriptionForeground, var(--vscode-editor-foreground));
      }

      input {
        width: 100%;
        border-radius: 10px;
        border: 1px solid var(--vscode-input-border, rgba(255, 255, 255, 0.14));
        background: var(--vscode-input-background);
        color: var(--vscode-input-foreground);
        font: inherit;
        padding: 12px 14px;
        outline: none;
      }

      input:focus {
        border-color: var(--vscode-focusBorder);
      }

      .actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 18px;
      }

      button {
        border: 1px solid transparent;
        border-radius: 999px;
        padding: 9px 16px;
        font: inherit;
        cursor: pointer;
      }

      .secondary {
        background: transparent;
        color: var(--vscode-button-secondaryForeground, var(--vscode-editor-foreground));
        border-color: var(--vscode-button-secondaryBackground, rgba(255, 255, 255, 0.12));
      }

      .primary {
        background: var(--vscode-button-background);
        color: var(--vscode-button-foreground);
      }
    </style>
  </head>
  <body>
    <form class="dialog-shell" id="dialog-form">
      <div class="dialog-body">
        <h1>${title}</h1>
        <p>${prompt}</p>
        <input id="dialog-input" type="text" placeholder="${placeholder}" value="${initialValue}" />
        <div class="actions">
          <button class="secondary" type="button" id="cancel-button">Cancel</button>
          <button class="primary" type="submit">${confirmLabel}</button>
        </div>
      </div>
    </form>
    <script>
      const vscode = acquireVsCodeApi();
      const form = document.getElementById('dialog-form');
      const input = document.getElementById('dialog-input');
      const cancelButton = document.getElementById('cancel-button');

      requestAnimationFrame(() => {
        input.focus();
        input.select();
      });

      form.addEventListener('submit', (event) => {
        event.preventDefault();
        vscode.postMessage({ type: 'submit', value: input.value });
      });

      cancelButton.addEventListener('click', () => {
        vscode.postMessage({ type: 'cancel' });
      });

      window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          vscode.postMessage({ type: 'cancel' });
        }
      });
    </script>
  </body>
</html>`;
}

export async function showPromptDialog(options: PromptDialogOptions): Promise<string | undefined> {
  const panel = vscode.window.createWebviewPanel(
    'critiqueMarkupPrompt',
    options.title,
    {
      viewColumn: vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.One,
      preserveFocus: false,
    },
    {
      enableScripts: true,
    }
  );

  panel.webview.html = buildPromptDialogHtml(options);

  return await new Promise<string | undefined>((resolve) => {
    let settled = false;

    const finish = (value: string | undefined) => {
      if (settled) {
        return;
      }
      settled = true;
      receiveDisposable.dispose();
      disposeDisposable.dispose();
      panel.dispose();
      resolve(value);
    };

    const receiveDisposable = panel.webview.onDidReceiveMessage((message) => {
      if (message?.type === 'submit') {
        finish(typeof message.value === 'string' ? message.value : '');
        return;
      }
      if (message?.type === 'cancel') {
        finish(undefined);
      }
    });

    const disposeDisposable = panel.onDidDispose(() => {
      finish(undefined);
    });
  });
}
