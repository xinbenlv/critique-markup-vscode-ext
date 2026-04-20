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
const USER_DATA_DIR = path.join(REPO_ROOT, '.tmp-vscode-userdata');
const WORKSPACE_DIR = path.join(os.tmpdir(), 'critique-markup-fixtures');

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

async function configureWorkbench(page) {
  await page.waitForTimeout(6000);
  await dismissNoise(page);
  await page.keyboard.press('F1');
  await page.waitForTimeout(300);
  await page.keyboard.type('View: Close Secondary Side Bar');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  await page.keyboard.press('F1');
  await page.waitForTimeout(300);
  await page.keyboard.type('View: Close Panel');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
}

async function openFile(page, fileName) {
  await page.keyboard.press('Meta+P');
  await page.waitForTimeout(250);
  await page.keyboard.type(fileName);
  await page.waitForTimeout(250);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1600);
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
    width: Math.floor(width),
    height: Math.floor(height),
  };
}

async function captureCropped(page, textRegex, outputName, options = {}) {
  const clip = await lineClip(page, textRegex, options);
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, outputName), clip });
}

async function captureFull(page, outputName) {
  await page.screenshot({ path: path.join(SCREENSHOT_DIR, outputName) });
}

async function showHover(page, textRegex) {
  const locator = page.getByText(textRegex).first();
  await locator.click();
  await page.waitForTimeout(300);
  await page.keyboard.press('F1');
  await page.waitForTimeout(250);
  await page.keyboard.type('Show Hover');
  await page.waitForTimeout(250);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(1200);
}

function makeGif(inputPattern, outputName, fps = 1) {
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-framerate',
      String(fps),
      '-pattern_type',
      'glob',
      '-i',
      inputPattern,
      '-vf',
      'scale=1200:-1:flags=lanczos',
      path.join(SCREENSHOT_DIR, outputName),
    ],
    { stdio: 'inherit' }
  );
}

(async () => {
  resetDir(SCREENSHOT_DIR);
  copyFixtures();
  resetDir(USER_DATA_DIR);

  const app = await electron.launch({
    executablePath: CODE_BIN,
    args: [
      WORKSPACE_DIR,
      '--user-data-dir=' + USER_DATA_DIR,
      '--extensionDevelopmentPath=' + REPO_ROOT,
      '--skip-welcome',
      '--skip-release-notes',
      '--disable-workspace-trust',
      '--disable-updates',
      '--no-sandbox',
    ],
    env: { ...process.env, NODE_ENV: 'test' },
  });

  try {
    const page = await app.firstWindow();
    await page.setViewportSize({ width: 1600, height: 980 });
    await configureWorkbench(page);

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
    await captureFull(page, 'tooltip-bubble.png');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    await openFile(page, 'visual-regression.md');
    await captureFull(page, 'visual-regression.png');
  } finally {
    await app.close();
  }

  makeGif(path.join(SCREENSHOT_DIR, '{add,delete,substitute,comment-over,tooltip-bubble}.png'), 'overview.gif', 0.8);
  makeGif(path.join(SCREENSHOT_DIR, '{comment-over,gutter-bubble,tooltip-bubble}.png'), 'comment-workflow.gif', 0.8);

  const expected = [
    'add.png',
    'delete.png',
    'substitute.png',
    'comment-over.png',
    'gutter-bubble.png',
    'tooltip-bubble.png',
    'visual-regression.png',
    'overview.gif',
    'comment-workflow.gif',
  ];

  for (const file of expected) {
    const fullPath = path.join(SCREENSHOT_DIR, file);
    if (!fs.existsSync(fullPath) || fs.statSync(fullPath).size === 0) {
      throw new Error(`Missing generated asset: ${file}`);
    }
  }

  console.log('Generated visual assets:', expected.join(', '));
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
