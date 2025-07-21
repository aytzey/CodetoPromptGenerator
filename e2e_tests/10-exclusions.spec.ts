import { test, expect } from '@playwright/test';
import { 
  waitForPageLoad, 
  selectProject, 
  waitForFileTreeLoad,
  switchTab
} from './helpers/test-utils';

test.describe('Exclusions Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
    await selectProject(page);
    await waitForFileTreeLoad(page);
    await switchTab(page, 'Exclusions');
  });

  test('should display exclusions manager', async ({ page }) => {
    const exclusionsManager = page.locator('[data-testid="exclusions-manager"], .exclusions-manager').first();
    await expect(exclusionsManager).toBeVisible();
  });

  test('should have global and local exclusions sections', async ({ page }) => {
    const globalSection = page.locator('[data-testid="global-exclusions"], .global-exclusions, h3:has-text("Global")').first();
    const localSection = page.locator('[data-testid="local-exclusions"], .local-exclusions, h3:has-text("Local")').first();
    
    await expect(globalSection).toBeVisible();
    await expect(localSection).toBeVisible();
  });

  test('should add new exclusion pattern', async ({ page }) => {
    const addInput = page.locator('input[placeholder*="pattern"], input[placeholder*="exclude"]').first();
    await addInput.fill('*.test.js');
    
    const addButton = page.locator('button:has-text("Add"), button:has-text("+")').first();
    await addButton.click();
    await page.waitForTimeout(500);
    
    const newExclusion = page.locator('[data-testid^="exclusion-"], .exclusion-item').filter({ hasText: '*.test.js' });
    await expect(newExclusion).toBeVisible();
  });

  test('should toggle exclusion active state', async ({ page }) => {
    const exclusion = page.locator('[data-testid^="exclusion-"], .exclusion-item').first();
    
    if (await exclusion.isVisible()) {
      const checkbox = exclusion.locator('input[type="checkbox"], [role="checkbox"]').first();
      const initialState = await checkbox.isChecked();
      
      await checkbox.click();
      await page.waitForTimeout(500);
      
      const newState = await checkbox.isChecked();
      expect(newState).toBe(!initialState);
    }
  });

  test('should delete exclusion pattern', async ({ page }) => {
    const exclusions = page.locator('[data-testid^="exclusion-"], .exclusion-item');
    const initialCount = await exclusions.count();
    
    if (initialCount > 0) {
      const firstExclusion = exclusions.first();
      const deleteButton = firstExclusion.locator('button:has-text("Delete"), [aria-label*="Delete"]').first();
      await deleteButton.click();
      await page.waitForTimeout(500);
      
      const afterDeleteCount = await exclusions.count();
      expect(afterDeleteCount).toBeLessThan(initialCount);
    }
  });

  test('should show default exclusion patterns', async ({ page }) => {
    const defaultPatterns = ['node_modules', '.git', '__pycache__', '.env'];
    
    for (const pattern of defaultPatterns) {
      const exclusionItem = page.locator(`[data-testid^="exclusion-"], .exclusion-item`).filter({ hasText: pattern });
      await expect(exclusionItem.first()).toBeVisible();
    }
  });

  test('should save exclusions', async ({ page }) => {
    const addInput = page.locator('input[placeholder*="pattern"], input[placeholder*="exclude"]').first();
    await addInput.fill('temp_*.js');
    
    const addButton = page.locator('button:has-text("Add"), button:has-text("+")').first();
    await addButton.click();
    await page.waitForTimeout(500);
    
    await page.reload();
    await waitForPageLoad(page);
    await selectProject(page);
    await waitForFileTreeLoad(page);
    await switchTab(page, 'Exclusions');
    
    const savedExclusion = page.locator('[data-testid^="exclusion-"], .exclusion-item').filter({ hasText: 'temp_*.js' });
    await expect(savedExclusion).toBeVisible();
  });
});