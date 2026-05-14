import { expect, test } from '@playwright/test';

/**
 * E2E happy path: sign in as the seeded demo buyer (dev mode),
 * place an order, verify it appears in the orders list.
 *
 * Requires:
 *   AUTH_MODE=dev set in apps/web env
 *   Seeded buyer (buyer@parshlo.local) in the database
 *   Seeded products with stock
 */
test.describe('Buyer happy path', () => {
  test('sign in as demo buyer, place an order, see it in orders', async ({ page }) => {
    await page.goto('/auth/sign-in');
    await expect(page.getByText(/dev mode/i)).toBeVisible();

    await page.getByRole('button', { name: /continue as demo buyer/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    await page.getByRole('link', { name: /catalog/i }).click();
    await expect(page).toHaveURL(/\/dashboard\/catalog$/);
    await expect(page.getByRole('heading', { name: /catalog/i })).toBeVisible();

    const firstAddButton = page.getByRole('button', { name: /add to cart/i }).first();
    await firstAddButton.click();

    await page.getByRole('button', { name: /cart$/i }).first().click();
    await expect(page.getByRole('heading', { name: /your cart/i })).toBeVisible();

    await page.getByRole('button', { name: /place order/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/orders\/.+/);
    await expect(page.getByText(/PSH-\d{4}-\d{6}/)).toBeVisible();
  });
});
