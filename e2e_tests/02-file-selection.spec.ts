import { test, expect } from '@playwright/test';
import { 
  waitForPageLoad, 
  selectProject, 
  waitForFileTreeLoad, 
  selectFileInTree,
  getSelectedFilesCount,
  getTotalTokenCount 
} from './helpers/test-utils';

test.describe('File Selection', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
    await selectProject(page);
    await waitForFileTreeLoad(page);
  });

  test('should select individual files', async ({ page }) => {
    const initialCount = await getSelectedFilesCount(page);
    expect(initialCount).toBe(0);

    await selectFileInTree(page, 'Lyra.txt');
    await page.waitForTimeout(500);

    const afterSelectCount = await getSelectedFilesCount(page);
    expect(afterSelectCount).toBeGreaterThan(0);
  });

  test('should update token count when selecting files', async ({ page }) => {
    const initialTokens = await getTotalTokenCount(page);
    
    await selectFileInTree(page, 'Lyra.txt');
    await page.waitForTimeout(1000);

    const afterSelectTokens = await getTotalTokenCount(page);
    expect(afterSelectTokens).toBeGreaterThan(initialTokens);
  });

  test('should deselect files', async ({ page }) => {
    await selectFileInTree(page, 'Lyra.txt');
    await page.waitForTimeout(500);
    
    const afterSelectCount = await getSelectedFilesCount(page);
    expect(afterSelectCount).toBeGreaterThan(0);

    await selectFileInTree(page, 'Lyra.txt');
    await page.waitForTimeout(500);

    const afterDeselectCount = await getSelectedFilesCount(page);
    expect(afterDeselectCount).toBe(0);
  });

  test('should select all files', async ({ page }) => {
    const selectAllButton = page.locator('button:has-text("Select All")').first();
    await selectAllButton.click();
    await page.waitForTimeout(1000);

    const selectedCount = await getSelectedFilesCount(page);
    expect(selectedCount).toBeGreaterThan(0);
  });

  test('should deselect all files', async ({ page }) => {
    const selectAllButton = page.locator('button:has-text("Select All")').first();
    await selectAllButton.click();
    await page.waitForTimeout(1000);

    const deselectAllButton = page.locator('button:has-text("Deselect All")').first();
    await deselectAllButton.click();
    await page.waitForTimeout(500);

    const selectedCount = await getSelectedFilesCount(page);
    expect(selectedCount).toBe(0);
  });

  test('should filter files in tree', async ({ page }) => {
    const searchInput = page.locator('input[placeholder*="Search files"]').first();
    await searchInput.fill('Lyra');
    await page.waitForTimeout(500);

    const visibleFiles = await page.locator('[data-testid*="file-"], .file-item').count();
    expect(visibleFiles).toBeGreaterThan(0);
    expect(visibleFiles).toBeLessThan(10);
  });
});