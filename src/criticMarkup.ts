export type CriticMarkupKind = 'addition' | 'deletion' | 'substitution' | 'comment';
export type ReviewAction = 'accept' | 'reject';
export type WrapCommand = 'Add' | 'Delete' | 'Substitute' | 'CommentOver';

export interface CriticMarkupToken {
  kind: CriticMarkupKind;
  raw: string;
  text: string;
  replacementText?: string;
  commentText?: string;
  start: number;
  end: number;
}

export interface WrapSelectionOptions {
  replacement?: string;
  comment?: string;
}

export interface ReviewActionResult {
  text: string;
  replacement: string;
}

export interface TokenOffsetRange {
  start: number;
  end: number;
}

export interface TokenPresentation {
  primaryRange: TokenOffsetRange;
  oldRange?: TokenOffsetRange;
  newRange?: TokenOffsetRange;
  commentRange?: TokenOffsetRange;
  targetRange?: TokenOffsetRange;
  inlineBubbleText?: string;
}

const TOKEN_PATTERNS: Array<{
  kind: CriticMarkupKind;
  regex: RegExp;
  mapMatch: (match: RegExpExecArray) => Omit<CriticMarkupToken, 'kind' | 'raw' | 'start' | 'end'>;
}> = [
  {
    kind: 'addition',
    regex: /\{\+\+([\s\S]*?)\+\+\}/g,
    mapMatch: (match) => ({ text: match[1] }),
  },
  {
    kind: 'deletion',
    regex: /\{--([\s\S]*?)--\}/g,
    mapMatch: (match) => ({ text: match[1] }),
  },
  {
    kind: 'substitution',
    regex: /\{~~([\s\S]*?)~>([\s\S]*?)~~\}/g,
    mapMatch: (match) => ({ text: match[1], replacementText: match[2] }),
  },
  {
    kind: 'comment',
    regex: /\{==([\s\S]*?)==\}\{>>([\s\S]*?)<<\}/g,
    mapMatch: (match) => ({ text: match[1], commentText: match[2] }),
  },
];

export function parseCriticMarkup(text: string): CriticMarkupToken[] {
  const tokens: CriticMarkupToken[] = [];

  for (const pattern of TOKEN_PATTERNS) {
    pattern.regex.lastIndex = 0;

    for (const match of text.matchAll(pattern.regex)) {
      const start = match.index ?? 0;
      const raw = match[0];
      tokens.push({
        kind: pattern.kind,
        raw,
        start,
        end: start + raw.length,
        ...pattern.mapMatch(match),
      });
    }
  }

  return tokens.sort((left, right) => left.start - right.start);
}

export function findTokenByStart(text: string, start: number): CriticMarkupToken | undefined {
  return parseCriticMarkup(text).find((token) => token.start === start);
}

export function applyReviewAction(
  source: string,
  token: CriticMarkupToken,
  action: ReviewAction
): ReviewActionResult {
  let replacement: string;

  switch (token.kind) {
    case 'addition':
      replacement = action === 'accept' ? token.text : '';
      break;
    case 'deletion':
      replacement = action === 'accept' ? '' : token.text;
      break;
    case 'substitution':
      replacement = action === 'accept' ? token.replacementText ?? '' : token.text;
      break;
    case 'comment':
      replacement = action === 'accept' ? token.text : '';
      break;
    default:
      replacement = token.raw;
  }

  return {
    replacement,
    text: `${source.slice(0, token.start)}${replacement}${source.slice(token.end)}`,
  };
}

export function wrapSelectionText(
  command: WrapCommand,
  selection: string,
  options: WrapSelectionOptions
): string {
  switch (command) {
    case 'Add':
      return `{++${selection || 'added text'}++}`;
    case 'Delete':
      return `{--${selection || 'deleted text'}--}`;
    case 'Substitute':
      return `{~~${selection || 'old text'}~>${options.replacement || 'new text'}~~}`;
    case 'CommentOver':
      return `{==${selection || 'commented text'}==}{>>${options.comment || 'Review comment'}<<}`;
    default:
      return selection;
  }
}

export function getTokenPresentation(token: CriticMarkupToken): TokenPresentation {
  switch (token.kind) {
    case 'addition': {
      const primaryRange = {
        start: token.start + 3,
        end: token.end - 3,
      };
      return { primaryRange };
    }
    case 'deletion': {
      const primaryRange = {
        start: token.start + 3,
        end: token.end - 3,
      };
      return { primaryRange };
    }
    case 'substitution': {
      const oldRange = {
        start: token.start + 3,
        end: token.start + 3 + token.text.length,
      };
      const newRange = {
        start: oldRange.end + 2,
        end: oldRange.end + 2 + (token.replacementText?.length ?? 0),
      };
      return {
        primaryRange: oldRange,
        oldRange,
        newRange,
      };
    }
    case 'comment': {
      const targetRange = {
        start: token.start + 3,
        end: token.start + 3 + token.text.length,
      };
      const commentStart = targetRange.end + 6;
      return {
        primaryRange: targetRange,
        commentRange: {
          start: commentStart,
          end: commentStart + (token.commentText?.length ?? 0),
        },
        targetRange,
        inlineBubbleText: `💬 ${token.commentText ?? ''}`,
      };
    }
    default:
      return { primaryRange: { start: token.start, end: token.end } };
  }
}
