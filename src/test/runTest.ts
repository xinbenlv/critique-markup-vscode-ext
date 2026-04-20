import * as path from 'path';

import { runTests } from '@vscode/test-electron';

async function main(): Promise<void> {
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, '../..');
    const extensionTestsPath = path.resolve(__dirname, './suite/index');
    const testWorkspace = path.resolve(__dirname, '../../test-fixtures');

    await runTests({
      extensionDevelopmentPath,
      extensionTestsPath,
      extensionTestsEnv: {
        VISUAL_REGRESSION: process.env.VISUAL_REGRESSION ?? '',
      },
      launchArgs: [testWorkspace, '--disable-extensions'],
    });
  } catch (error) {
    console.error('Failed to run tests');
    throw error;
  }
}

void main();
