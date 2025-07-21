import { test, expect } from '@playwright/test';
import { 
  waitForPageLoad, 
  selectProject, 
  waitForFileTreeLoad,
  switchTab
} from './helpers/test-utils';

test.describe('Kanban Board', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
    await selectProject(page);
    await waitForFileTreeLoad(page);
    await switchTab(page, 'Kanban');
  });

  test('should display kanban columns', async ({ page }) => {
    const columns = ['TODO', 'In Progress', 'Done'];
    
    for (const column of columns) {
      const columnElement = page.locator(`[data-testid="kanban-column-${column}"], .kanban-column:has-text("${column}")`).first();
      await expect(columnElement).toBeVisible();
    }
  });

  test('should add new task', async ({ page }) => {
    const addButton = page.locator('button:has-text("Add"), button:has-text("+")').first();
    await addButton.click();
    
    const taskInput = page.locator('input[placeholder*="task"], textarea[placeholder*="task"]').first();
    await taskInput.fill('Test Task 1');
    
    const saveButton = page.locator('button:has-text("Save"), button:has-text("Add")').last();
    await saveButton.click();
    await page.waitForTimeout(500);
    
    const newTask = page.locator('[data-testid^="kanban-task-"], .kanban-task').filter({ hasText: 'Test Task 1' });
    await expect(newTask).toBeVisible();
  });

  test('should drag task between columns', async ({ page }) => {
    const task = page.locator('[data-testid^="kanban-task-"], .kanban-task').first();
    const inProgressColumn = page.locator('[data-testid="kanban-column-In Progress"], .kanban-column:has-text("In Progress")').first();
    
    if (await task.isVisible()) {
      await task.dragTo(inProgressColumn);
      await page.waitForTimeout(500);
      
      const movedTask = inProgressColumn.locator('[data-testid^="kanban-task-"], .kanban-task').first();
      await expect(movedTask).toBeVisible();
    }
  });

  test('should edit task', async ({ page }) => {
    const task = page.locator('[data-testid^="kanban-task-"], .kanban-task').first();
    
    if (await task.isVisible()) {
      await task.dblclick();
      
      const editModal = page.locator('[role="dialog"], .dialog-content').first();
      await expect(editModal).toBeVisible();
      
      const taskInput = editModal.locator('input, textarea').first();
      await taskInput.fill('Updated Task Name');
      
      const saveButton = editModal.locator('button:has-text("Save")').first();
      await saveButton.click();
      await page.waitForTimeout(500);
      
      await expect(task).toContainText('Updated Task Name');
    }
  });

  test('should delete task', async ({ page }) => {
    const tasks = page.locator('[data-testid^="kanban-task-"], .kanban-task');
    const initialCount = await tasks.count();
    
    if (initialCount > 0) {
      const firstTask = tasks.first();
      await firstTask.hover();
      
      const deleteButton = firstTask.locator('button:has-text("Delete"), [aria-label*="Delete"]').first();
      await deleteButton.click();
      await page.waitForTimeout(500);
      
      const afterDeleteCount = await tasks.count();
      expect(afterDeleteCount).toBeLessThan(initialCount);
    }
  });

  test('should filter tasks', async ({ page }) => {
    const filterInput = page.locator('input[placeholder*="Filter"], input[placeholder*="Search"]').first();
    
    if (await filterInput.isVisible()) {
      await filterInput.fill('Test');
      await page.waitForTimeout(500);
      
      const visibleTasks = await page.locator('[data-testid^="kanban-task-"], .kanban-task').count();
      const allTasksWithTest = await page.locator('[data-testid^="kanban-task-"]:has-text("Test"), .kanban-task:has-text("Test")').count();
      
      expect(visibleTasks).toBe(allTasksWithTest);
    }
  });
});