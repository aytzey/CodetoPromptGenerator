import { Page, expect } from '@playwright/test';
import path from 'path';

export const TEST_PROJECT_PATH = path.join(__dirname, '../../sample_project');

export async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('[data-testid="main-layout"], .container', { timeout: 30000 });
}

export async function selectProject(page: Page, projectPath: string = TEST_PROJECT_PATH) {
  await page.fill('input[placeholder*="project path"]', projectPath);
  await page.press('input[placeholder*="project path"]', 'Enter');
  await page.waitForTimeout(2000);
}

export async function waitForFileTreeLoad(page: Page) {
  await page.waitForSelector('[data-testid="file-tree"], .file-tree', { timeout: 30000 });
  await page.waitForTimeout(1000);
}

export async function selectFileInTree(page: Page, fileName: string) {
  const fileSelector = `[data-testid="file-${fileName}"], div:has-text("${fileName}")`;
  await page.waitForSelector(fileSelector, { timeout: 10000 });
  await page.click(fileSelector);
}

export async function getSelectedFilesCount(page: Page): Promise<number> {
  const countText = await page.textContent('[data-testid="selected-count"], span:has-text("files selected")');
  if (!countText) return 0;
  const match = countText.match(/(\d+)\s*files?\s*selected/);
  return match ? parseInt(match[1], 10) : 0;
}

export async function getTotalTokenCount(page: Page): Promise<number> {
  const tokenText = await page.textContent('[data-testid="token-count"], span:has-text("tokens")');
  if (!tokenText) return 0;
  const match = tokenText.match(/(\d+)\s*tokens?/);
  return match ? parseInt(match[1], 10) : 0;
}

export async function switchTab(page: Page, tabName: string) {
  await page.click(`[role="tab"]:has-text("${tabName}"), button:has-text("${tabName}")`);
  await page.waitForTimeout(500);
}

export async function openSettingsModal(page: Page) {
  await page.click('[data-testid="settings-button"], button[aria-label*="Settings"]');
  await page.waitForSelector('[role="dialog"], .dialog-content', { timeout: 5000 });
}

export async function closeModal(page: Page) {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
}