import { expect, type Page } from '@playwright/test';

/** Opens the page and waits for the title screen (roadmap M3.4). */
export async function openTitle(page: Page, query = ''): Promise<void> {
  await page.goto(`./${query}`);
  await expect
    .poll(() => page.evaluate(() => window.__game?.scene() ?? null), { timeout: 15_000 })
    .toBe('Title');
}

/** Opens the page, starts from the title screen with Enter, and waits for the game. */
export async function openGame(page: Page, query = ''): Promise<void> {
  await openTitle(page, query);
  await page.keyboard.press('Enter');
  await expect
    .poll(() => page.evaluate(() => window.__game?.scene() ?? null), { timeout: 15_000 })
    .toBe('Game');
}
