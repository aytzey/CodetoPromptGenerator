import { test, expect } from '@playwright/test';
import { 
  waitForPageLoad,
  openSettingsModal
} from './helpers/test-utils';

test.describe('Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
  });

  test('should handle invalid project path', async ({ page }) => {
    const folderInput = page.locator('input[placeholder*="project path"]');
    await folderInput.fill('/invalid/path/that/does/not/exist');
    await folderInput.press('Enter');
    await page.waitForTimeout(2000);
    
    const errorMessage = page.locator('[role="alert"], .error-message, .toast-error').first();
    const isErrorVisible = await errorMessage.isVisible();
    
    if (!isErrorVisible) {
      const fileTree = page.locator('[data-testid="file-tree"], .file-tree').first();
      const isTreeVisible = await fileTree.isVisible();
      expect(isTreeVisible).toBe(false);
    }
  });

  test('should handle empty project path', async ({ page }) => {
    const folderInput = page.locator('input[placeholder*="project path"]');
    await folderInput.clear();
    await folderInput.press('Enter');
    await page.waitForTimeout(1000);
    
    const fileTree = page.locator('[data-testid="file-tree"], .file-tree').first();
    const isTreeVisible = await fileTree.isVisible();
    expect(isTreeVisible).toBe(false);
  });

  test('should show loading state during operations', async ({ page }) => {
    const folderInput = page.locator('input[placeholder*="project path"]');
    await folderInput.fill('/home');
    
    const enterPromise = folderInput.press('Enter');
    await page.waitForTimeout(100);
    
    const loadingIndicator = page.locator('.loading, [data-loading="true"], .loader').first();
    const isLoadingVisible = await loadingIndicator.isVisible();
    
    await enterPromise;
    expect(isLoadingVisible).toBe(true);
  });

  test('should handle API errors gracefully', async ({ page }) => {
    await page.route('**/api/**', route => route.abort());
    
    const folderInput = page.locator('input[placeholder*="project path"]');
    await folderInput.fill('/home');
    await folderInput.press('Enter');
    await page.waitForTimeout(2000);
    
    const errorToast = page.locator('[role="alert"], .toast-error').first();
    const isErrorVisible = await errorToast.isVisible();
    
    const fileTree = page.locator('[data-testid="file-tree"], .file-tree').first();
    const isTreeVisible = await fileTree.isVisible();
    expect(isTreeVisible || isErrorVisible).toBe(true);
  });

  test('should validate settings input', async ({ page }) => {
    const folderInput = page.locator('input[placeholder*="project path"]');
    await folderInput.fill('/home');
    await folderInput.press('Enter');
    await page.waitForTimeout(2000);
    
    await openSettingsModal(page);
    
    const temperatureInput = page.locator('input[type="range"], input[type="number"][step="0.1"]').first();
    if (await temperatureInput.isVisible() && await temperatureInput.getAttribute('type') === 'number') {
      await temperatureInput.fill('2.5');
      await page.waitForTimeout(500);
      
      const value = await temperatureInput.inputValue();
      const numValue = parseFloat(value);
      expect(numValue).toBeLessThanOrEqual(2.0);
    }
  });

  test('should handle network timeout', async ({ page }) => {
    await page.route('**/api/**', async route => {
      await new Promise(resolve => setTimeout(resolve, 35000));
      route.abort();
    });
    
    const folderInput = page.locator('input[placeholder*="project path"]');
    await folderInput.fill('/home');
    await folderInput.press('Enter');
    
    await page.waitForTimeout(5000);
    
    const timeoutError = page.locator('[role="alert"], .error-message').first();
    const errorText = await timeoutError.textContent().catch(() => '');
    
    const hasTimeout = errorText.toLowerCase().includes('timeout') || errorText.toLowerCase().includes('time out');
    const fileTree = page.locator('[data-testid="file-tree"], .file-tree').first();
    const isTreeVisible = await fileTree.isVisible();
    
    expect(hasTimeout || isTreeVisible).toBe(true);
  });
});