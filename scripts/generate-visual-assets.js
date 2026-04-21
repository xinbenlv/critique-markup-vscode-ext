const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { _electron: electron } = require('playwright');

const REPO_ROOT = path.resolve(__dirname, '..');
const CODE_BIN = path.join(
  REPO_ROOT,
  '.vscode-test/vscode-darwin-arm64-1.116.0/Visual Studio Code.app/Contents/MacOS/Code'
);
const SCREENSHOT_DIR = path.join(REPO_ROOT, 'assets', 'screenshots');
const FRAME_DIR = path.join(SCREENSHOT_DIR, '.gif-frames');
const USER_DATA_DIR = path.join(REPO_ROOT, '.tmp-vscode-userdata');
const WORKSPACE_DIR = path.join(os.tmpdir(), 'critique-markup-fixtures');
const VIEWPORT = { width: 1280, height: 960 };

function resetDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function copyFixtures() {
  resetDir(WORKSPACE_DIR);
  for (const file of fs.readdirSync(path.join(REPO_ROOT, 'test-fixtures'))) {
    const source = path.join(REPO_ROOT, 'test-fixtures', file);
    const target = path.join(WORKSPACE_DIR, file);
    if (fs.statSync(source).isFile()) {
      fs.copyFileSync(source, target);
    }
  }
}

async function dismissNoise(page) {
  const buttons = ['Never', 'No', 'Got it'];
  for (const text of buttons) {
    const locator = page.getByText(text, { exact: true });
    if (await locator.count()) {
      try {
        await locator.first().click({ timeout: 1000 });
      } catch {}
    }
  }
}

async function runCommand(page, commandText) {
  await page.keyboard.press('F1');
  await page.waitForTimeout(350);
  await page.keyboard.type(commandText);
  await page.waitForTimeout(350);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
}

async function configureWorkbench(page) {
  await page.waitForTimeout(6000);
  await dismissNoise(page);
  await runCommand(page, 'View: Close Secondary Side Bar');
  await runCommand(page, 'View: Appearance: Hide Panel');
  await runCommand(page, 'View: Reset Zoom');
}

async function setWindowBounds(app) {
  await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows()[0];
    if (!win) {
      throw new Error('No BrowserWindow available');
    }
    win.setBounds({ x: 40, y: 40, width: 1280, height: 960 });
    win.show();
    win.focus();
  });
}

async function openFile(page, fileName) {
  await runCommand(page, 'View: Close All Editors');
  await page.keyboard.press('Meta+P');
  await page.waitForTimeout(250);
  await page.keyboard.type(fileName);
  await page.waitForTimeout(250);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1800);
}

async function lineClip(page, textRegex, options = {}) {
  const locator = page.getByText(textRegex).first();
  await locator.waitFor({ timeout: 10000 });
  const box = await locator.boundingBox();
  if (!box) throw new Error(`No bounding box for ${textRegex}`);
  const padX = options.padX ?? 110;
  const padY = options.padY ?? 55;
  const width = options.width ?? 900;
  const height = options.height ?? 180;
  return {
    x: Math.max(0, Math.floor(box.x - padX)),
    y: Math.max(0, Math.floor(box.y - padY)),
    width: Math.min(Math.floor(width), VIEWPORT.width),
    height: Math.min(Math.floor(height), VIEWPORT.height),
  };
}

async function capturePng(page, outputName, options = {}) {
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, outputName), clip: options.clip });
}

async function captureCropped(page, textRegex, outputName, options = {}) {
  const clip = await lineClip(page, textRegex, options);
  await capturePng(page, outputName, { clip });
}

async function captureOptimizedStill(page, baseName, options = {}) {
  const pngTemp = path.join(SCREENSHOT_DIR, `${baseName}.tmp.png`);
  const jpgTemp = path.join(SCREENSHOT_DIR, `${baseName}.tmp.jpg`);
  const pngPath = path.join(SCREENSHOT_DIR, `${baseName}.png`);
  const jpgPath = path.join(SCREENSHOT_DIR, `${baseName}.jpg`);

  await page.screenshot({ path: pngTemp, clip: options.clip });

  if (options.gifFrame) {
    fs.copyFileSync(pngTemp, path.join(FRAME_DIR, `${baseName}.png`));
  }

  await page.screenshot({ path: jpgTemp, clip: options.clip, type: 'jpeg', quality: 94 });

  const pngSize = fs.statSync(pngTemp).size;
  const jpgSize = fs.statSync(jpgTemp).size;
  const keepJpg = jpgSize < pngSize;

  fs.rmSync(pngPath, { force: true });
  fs.rmSync(jpgPath, { force: true });

  if (keepJpg) {
    fs.renameSync(jpgTemp, jpgPath);
    fs.rmSync(pngTemp, { force: true });
    return path.basename(jpgPath);
  }

  fs.renameSync(pngTemp, pngPath);
  fs.rmSync(jpgTemp, { force: true });
  return path.basename(pngPath);
}

async function showHover(page, textRegex) {
  const locator = page.getByText(textRegex).first();
  await locator.click();
  await page.waitForTimeout(300);
  await runCommand(page, 'Show Hover');
  await page.waitForTimeout(1200);
}

async function closePanel(page) {
  await page.mouse.click(1258, 685);
  await page.waitForTimeout(500);
}

async function showContextMenuOverlay(page) {
  await page.evaluate(() => {
    document.getElementById('critique-markup-context-menu-demo')?.remove();

    const menu = document.createElement('div');
    menu.id = 'critique-markup-context-menu-demo';
    menu.setAttribute('aria-label', 'Editor context menu');
    menu.style.position = 'fixed';
    menu.style.left = '650px';
    menu.style.top = '528px';
    menu.style.width = '284px';
    menu.style.padding = '6px 0';
    menu.style.border = '1px solid rgba(120, 135, 160, 0.45)';
    menu.style.borderRadius = '4px';
    menu.style.background = '#252526';
    menu.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.45)';
    menu.style.color = '#cccccc';
    menu.style.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    menu.style.zIndex = '999999';

    const items = [
      'Cut',
      'Copy',
      'Paste',
      '',
      'Critique Markup: Comment Over',
      'Critique Markup: Delete',
      'Critique Markup: Substitute',
    ];

    for (const item of items) {
      if (!item) {
        const separator = document.createElement('div');
        separator.style.height = '1px';
        separator.style.margin = '5px 0';
        separator.style.background = 'rgba(255, 255, 255, 0.12)';
        menu.append(separator);
        continue;
      }

      const row = document.createElement('div');
      row.textContent = item;
      row.style.height = '26px';
      row.style.lineHeight = '26px';
      row.style.padding = '0 14px';
      row.style.whiteSpace = 'nowrap';
      if (item === 'Critique Markup: Comment Over') {
        row.style.background = '#094771';
        row.style.color = '#ffffff';
      }
      menu.append(row);
    }

    document.body.append(menu);
  });
}

function makeGif(framePattern, outputName, fps = 1 / 3) {
  const palettePath = path.join(SCREENSHOT_DIR, '._palette.png');
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-framerate',
      String(fps),
      '-pattern_type',
      'glob',
      '-i',
      framePattern,
      '-vf',
      'scale=1280:960:flags=lanczos,palettegen=stats_mode=single',
      '-frames:v',
      '1',
      '-update',
      '1',
      palettePath,
    ],
    { stdio: 'inherit' }
  );
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-framerate',
      String(fps),
      '-pattern_type',
      'glob',
      '-i',
      framePattern,
      '-i',
      palettePath,
      '-lavfi',
      'scale=1280:960:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3',
      '-loop',
      '0',
      path.join(SCREENSHOT_DIR, outputName),
    ],
    { stdio: 'inherit' }
  );
}

async function prepareCommentHoverState(page, textRegex = /Migration/) {
  await showHover(page, textRegex);
  await page.waitForTimeout(800);
}

async function createAddCommentOverScenario(page) {
  await openFile(page, 'comment.md');
  await runCommand(page, 'View: Appearance: Hide Panel');
  await prepareCommentHoverState(page, /Migration/);
}

async function createAcceptEditsScenario(page) {
  await openFile(page, 'accept.md');
  const acceptLocator = page.getByText('Accept', { exact: true });
  await acceptLocator.first().click({ timeout: 10000 });
  await page.waitForTimeout(1800);
  await page.keyboard.press('Meta+S');
  await page.waitForTimeout(500);
}

async function createPlanReviewScenario(page) {
  console.log('Preparing LLM plan review frame');
  await openFile(page, 'plan.md');
  await runCommand(page, 'View: Appearance: Hide Panel');
  await closePanel(page);
  await page.waitForTimeout(1800);
}

async function createContextMenuScenario(page) {
  console.log('Preparing right-click context menu frame');
  await openFile(page, 'plan.md');
  await runCommand(page, 'View: Appearance: Hide Panel');
  await closePanel(page);

  const startX = 415;
  const endX = 900;
  const y = 540;

  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(endX, y, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  await page.mouse.click((startX + endX) / 2, y, { button: 'right' });
  await showContextMenuOverlay(page);
  await page.waitForTimeout(1200);
}

(async () => {
  resetDir(SCREENSHOT_DIR);
  resetDir(FRAME_DIR);
  copyFixtures();
  resetDir(USER_DATA_DIR);

  const app = await electron.launch({
    executablePath: CODE_BIN,
    args: [
      WORKSPACE_DIR,
      '--user-data-dir=' + USER_DATA_DIR,
      '--extensionDevelopmentPath=' + REPO_ROOT,
      '--disable-extensions',
      '--skip-welcome',
      '--skip-release-notes',
      '--disable-workspace-trust',
      '--disable-updates',
      '--no-sandbox',
    ],
    env: { ...process.env, NODE_ENV: 'test' },
  });

  const expected = [];

  try {
    const page = await app.firstWindow();
    await setWindowBounds(app);
    await page.waitForTimeout(1200);
    await page.setViewportSize(VIEWPORT);
    await configureWorkbench(page);

    await openFile(page, 'visual-regression.md');
    await runCommand(page, 'View: Appearance: Hide Panel');
    await prepareCommentHoverState(page, /Migration/);
    console.log('Capturing frame 01');
    expected.push(await captureOptimizedStill(page, '01-full-feature', { gifFrame: true }));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    await createAddCommentOverScenario(page);
    console.log('Capturing frame 02');
    expected.push(await captureOptimizedStill(page, '02-adding-comment-over', { gifFrame: true }));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    await createAcceptEditsScenario(page);
    await runCommand(page, 'View: Appearance: Hide Panel');
    console.log('Capturing frame 03');
    expected.push(await captureOptimizedStill(page, '03-accepting-edits', { gifFrame: true }));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    await createPlanReviewScenario(page);
    console.log('Capturing frame 04');
    expected.push(await captureOptimizedStill(page, '04-llm-plan-review', { gifFrame: true }));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    await createContextMenuScenario(page);
    console.log('Capturing frame 05');
    expected.push(await captureOptimizedStill(page, '05-right-click-comment-over', { gifFrame: true }));
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    await openFile(page, 'add.md');
    await captureCropped(page, /Ship/, 'add.png');

    await openFile(page, 'delete.md');
    await captureCropped(page, /Drop/, 'delete.png');

    await openFile(page, 'substitute.md');
    await captureCropped(page, /Use/, 'substitute.png');

    await openFile(page, 'comment.md');
    await captureCropped(page, /Migration/, 'comment-over.png', { width: 980 });
    await captureCropped(page, /Migration/, 'gutter-bubble.png', { padX: 170, width: 1040 });

    await showHover(page, /Migration/);
    await capturePng(page, 'tooltip-bubble.png');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  } finally {
    await app.close();
  }

  makeGif(path.join(FRAME_DIR, '*.png'), 'overview.gif');

  expected.push(
    'add.png',
    'delete.png',
    'substitute.png',
    'comment-over.png',
    'gutter-bubble.png',
    'tooltip-bubble.png',
    'overview.gif'
  );

  for (const file of expected) {
    const fullPath = path.join(SCREENSHOT_DIR, file);
    if (!fs.existsSync(fullPath) || fs.statSync(fullPath).size === 0) {
      throw new Error(`Missing generated asset: ${file}`);
    }
  }

  fs.rmSync(FRAME_DIR, { recursive: true, force: true });
  fs.rmSync(path.join(SCREENSHOT_DIR, '._palette.png'), { force: true });
  fs.rmSync(USER_DATA_DIR, { recursive: true, force: true });
  console.log('Generated visual assets:', expected.join(', '));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
