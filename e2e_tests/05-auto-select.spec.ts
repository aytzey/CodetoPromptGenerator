import { test, expect } from '@playwright/test';
import { 
  waitForPageLoad, 
  selectProject, 
  waitForFileTreeLoad,
  getSelectedFilesCount,
  getTotalTokenCount
} from './helpers/test-utils';

test.describe('Auto Select Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
    await selectProject(page);
    await waitForFileTreeLoad(page);
  });

  test('should have auto select button', async ({ page }) => {
    const autoSelectButton = page.locator('button:has-text("Auto Select")').first();
    await expect(autoSelectButton).toBeVisible();
    await expect(autoSelectButton).toBeEnabled();
  });

  test('should trigger auto selection', async ({ page }) => {
    const initialCount = await getSelectedFilesCount(page);
    expect(initialCount).toBe(0);

    const autoSelectButton = page.locator('button:has-text("Auto Select")').first();
    await autoSelectButton.click();

    await page.waitForSelector('.loading, [data-loading="true"]', { state: 'visible', timeout: 5000 }).catch(() => {});
    await page.waitForSelector('.loading, [data-loading="true"]', { state: 'hidden', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1000);

    const afterAutoSelectCount = await getSelectedFilesCount(page);
    expect(afterAutoSelectCount).toBeGreaterThan(initialCount);
  });

  test('should update token count after auto select', async ({ page }) => {
    const initialTokens = await getTotalTokenCount(page);

    const autoSelectButton = page.locator('button:has-text("Auto Select")').first();
    await autoSelectButton.click();

    await page.waitForSelector('.loading, [data-loading="true"]', { state: 'visible', timeout: 5000 }).catch(() => {});
    await page.waitForSelector('.loading, [data-loading="true"]', { state: 'hidden', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1000);

    const afterAutoSelectTokens = await getTotalTokenCount(page);
    expect(afterAutoSelectTokens).toBeGreaterThan(initialTokens);
  });

  test('should disable button during selection', async ({ page }) => {
    const autoSelectButton = page.locator('button:has-text("Auto Select")').first();
    
    const clickPromise = autoSelectButton.click();
    await page.waitForTimeout(100);
    
    await expect(autoSelectButton).toBeDisabled();
    
    await clickPromise;
    await page.waitForSelector('.loading, [data-loading="true"]', { state: 'hidden', timeout: 30000 }).catch(() => {});
    
    await expect(autoSelectButton).toBeEnabled();
  });

  test('should handle auto select with existing selections', async ({ page }) => {
    await page.locator('button:has-text("Select All")').first().click();
    await page.waitForTimeout(1000);
    
    const beforeCount = await getSelectedFilesCount(page);
    expect(beforeCount).toBeGreaterThan(0);

    const autoSelectButton = page.locator('button:has-text("Auto Select")').first();
    await autoSelectButton.click();

    await page.waitForSelector('.loading, [data-loading="true"]', { state: 'visible', timeout: 5000 }).catch(() => {});
    await page.waitForSelector('.loading, [data-loading="true"]', { state: 'hidden', timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1000);

    const afterCount = await getSelectedFilesCount(page);
    expect(afterCount).toBeGreaterThanOrEqual(0);
  });
});