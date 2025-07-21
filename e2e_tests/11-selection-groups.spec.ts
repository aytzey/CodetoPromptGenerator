import { test, expect } from '@playwright/test';
import { 
  waitForPageLoad, 
  selectProject, 
  waitForFileTreeLoad,
  switchTab,
  selectFileInTree
} from './helpers/test-utils';

test.describe('Selection Groups', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
    await selectProject(page);
    await waitForFileTreeLoad(page);
  });

  test('should display selection groups tab', async ({ page }) => {
    await switchTab(page, 'Selection Groups');
    
    const selectionGroups = page.locator('[data-testid="selection-groups"], .selection-groups').first();
    await expect(selectionGroups).toBeVisible();
  });

  test('should create new selection group', async ({ page }) => {
    await selectFileInTree(page, 'Lyra.txt');
    await page.waitForTimeout(500);
    
    await switchTab(page, 'Selection Groups');
    
    const saveButton = page.locator('button:has-text("Save"), button:has-text("Create")').first();
    await saveButton.click();
    
    const groupNameInput = page.locator('input[placeholder*="group name"], input[placeholder*="name"]').first();
    await groupNameInput.fill('Test Group 1');
    
    const confirmButton = page.locator('button:has-text("Save"), button:has-text("Create")').last();
    await confirmButton.click();
    await page.waitForTimeout(500);
    
    const newGroup = page.locator('[data-testid^="group-"], .group-item').filter({ hasText: 'Test Group 1' });
    await expect(newGroup).toBeVisible();
  });

  test('should load selection group', async ({ page }) => {
    await switchTab(page, 'Selection Groups');
    
    const group = page.locator('[data-testid^="group-"], .group-item').first();
    
    if (await group.isVisible()) {
      const loadButton = group.locator('button:has-text("Load"), button:has-text("Apply")').first();
      await loadButton.click();
      await page.waitForTimeout(500);
      
      await switchTab(page, 'File Explorer');
      const selectedCount = await page.locator('[data-testid="selected-count"], span:has-text("files selected")').first().textContent();
      expect(selectedCount).toMatch(/\d+\s*files?\s*selected/);
    }
  });

  test('should update selection group', async ({ page }) => {
    await switchTab(page, 'Selection Groups');
    
    const group = page.locator('[data-testid^="group-"], .group-item').first();
    
    if (await group.isVisible()) {
      await switchTab(page, 'File Explorer');
      await selectFileInTree(page, 'p1.txt');
      await page.waitForTimeout(500);
      
      await switchTab(page, 'Selection Groups');
      const updateButton = group.locator('button:has-text("Update")').first();
      await updateButton.click();
      await page.waitForTimeout(500);
      
      const updatedText = await group.textContent();
      expect(updatedText).toContain('Updated');
    }
  });

  test('should delete selection group', async ({ page }) => {
    await switchTab(page, 'Selection Groups');
    
    const groups = page.locator('[data-testid^="group-"], .group-item');
    const initialCount = await groups.count();
    
    if (initialCount > 0) {
      const firstGroup = groups.first();
      const deleteButton = firstGroup.locator('button:has-text("Delete"), [aria-label*="Delete"]').first();
      await deleteButton.click();
      
      await page.waitForTimeout(500);
      
      const afterDeleteCount = await groups.count();
      expect(afterDeleteCount).toBeLessThan(initialCount);
    }
  });

  test('should show group file count', async ({ page }) => {
    await switchTab(page, 'Selection Groups');
    
    const group = page.locator('[data-testid^="group-"], .group-item').first();
    
    if (await group.isVisible()) {
      const groupText = await group.textContent();
      expect(groupText).toMatch(/\d+\s*files?/);
    }
  });

  test('should rename selection group', async ({ page }) => {
    await switchTab(page, 'Selection Groups');
    
    const group = page.locator('[data-testid^="group-"], .group-item').first();
    
    if (await group.isVisible()) {
      const renameButton = group.locator('button:has-text("Rename"), [aria-label*="Rename"]').first();
      if (await renameButton.isVisible()) {
        await renameButton.click();
        
        const nameInput = page.locator('input[value*="Group"], input[value*="group"]').first();
        await nameInput.fill('Renamed Group');
        await nameInput.press('Enter');
        await page.waitForTimeout(500);
        
        await expect(group).toContainText('Renamed Group');
      }
    }
  });
});