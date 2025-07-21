import { test, expect } from '@playwright/test';
import { 
  waitForPageLoad, 
  selectProject, 
  waitForFileTreeLoad,
  switchTab
} from './helpers/test-utils';

test.describe('TODO List', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await waitForPageLoad(page);
    await selectProject(page);
    await waitForFileTreeLoad(page);
    await switchTab(page, 'TODO');
  });

  test('should display todo list', async ({ page }) => {
    const todoList = page.locator('[data-testid="todo-list"], .todo-list').first();
    await expect(todoList).toBeVisible();
  });

  test('should add new todo', async ({ page }) => {
    const addInput = page.locator('input[placeholder*="Add"], input[placeholder*="todo"]').first();
    await addInput.fill('New TODO item');
    await addInput.press('Enter');
    await page.waitForTimeout(500);
    
    const newTodo = page.locator('[data-testid^="todo-"], .todo-item').filter({ hasText: 'New TODO item' });
    await expect(newTodo).toBeVisible();
  });

  test('should toggle todo completion', async ({ page }) => {
    const todo = page.locator('[data-testid^="todo-"], .todo-item').first();
    
    if (await todo.isVisible()) {
      const checkbox = todo.locator('input[type="checkbox"], [role="checkbox"]').first();
      await checkbox.click();
      await page.waitForTimeout(500);
      
      const isChecked = await checkbox.isChecked();
      expect(isChecked).toBe(true);
      
      await checkbox.click();
      await page.waitForTimeout(500);
      
      const isUnchecked = await checkbox.isChecked();
      expect(isUnchecked).toBe(false);
    }
  });

  test('should edit todo', async ({ page }) => {
    const todo = page.locator('[data-testid^="todo-"], .todo-item').first();
    
    if (await todo.isVisible()) {
      const editButton = todo.locator('button:has-text("Edit"), [aria-label*="Edit"]').first();
      await editButton.click();
      
      const editInput = todo.locator('input[type="text"]').first();
      await editInput.fill('Updated TODO item');
      await editInput.press('Enter');
      await page.waitForTimeout(500);
      
      await expect(todo).toContainText('Updated TODO item');
    }
  });

  test('should delete todo', async ({ page }) => {
    const todos = page.locator('[data-testid^="todo-"], .todo-item');
    const initialCount = await todos.count();
    
    if (initialCount > 0) {
      const firstTodo = todos.first();
      const deleteButton = firstTodo.locator('button:has-text("Delete"), [aria-label*="Delete"]').first();
      await deleteButton.click();
      await page.waitForTimeout(500);
      
      const afterDeleteCount = await todos.count();
      expect(afterDeleteCount).toBeLessThan(initialCount);
    }
  });

  test('should filter todos', async ({ page }) => {
    const filterButtons = page.locator('button:has-text("All"), button:has-text("Active"), button:has-text("Completed")');
    
    if (await filterButtons.first().isVisible()) {
      const activeButton = page.locator('button:has-text("Active")').first();
      await activeButton.click();
      await page.waitForTimeout(500);
      
      const completedTodos = await page.locator('[data-testid^="todo-"].completed, .todo-item.completed').count();
      expect(completedTodos).toBe(0);
    }
  });

  test('should show todo count', async ({ page }) => {
    const todoCount = page.locator('[data-testid="todo-count"], .todo-count').first();
    
    if (await todoCount.isVisible()) {
      const countText = await todoCount.textContent();
      expect(countText).toMatch(/\d+\s*(items?|todos?)/i);
    }
  });
});