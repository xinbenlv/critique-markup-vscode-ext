import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

suite('package contributions', () => {
  const packageJsonPath = path.resolve(__dirname, '../../../package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const editorContextMenus = packageJson.contributes?.menus?.['editor/context'] ?? [];

  function findMenu(command: string) {
    return editorContextMenus.find((item: { command?: string }) => item.command === command);
  }

  test('shows selection-only review commands in the markdown editor context menu', () => {
    const expectedCommands = [
      'critiqueMarkup.commentOver',
      'critiqueMarkup.delete',
      'critiqueMarkup.substitute',
    ];

    for (const command of expectedCommands) {
      const menu = findMenu(command);
      assert.ok(menu, `missing editor/context menu for ${command}`);
      assert.equal(menu.when, 'resourceLangId == markdown && editorHasSelection');
    }
  });

  test('shows add in the markdown editor context menu only when no text is selected', () => {
    const menu = findMenu('critiqueMarkup.add');
    assert.ok(menu, 'missing editor/context menu for critiqueMarkup.add');
    assert.equal(menu.when, 'resourceLangId == markdown && !editorHasSelection');
  });
});
