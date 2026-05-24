import { test, expect } from '@playwright/test';

test.describe('LEGO Dimensions Toypad Dashboard E2E Tests', () => {
  
  test.beforeEach(async ({ page, request }) => {
    // Listen to page console and network requests for debugging
    page.on('console', msg => console.log('PAGE CONSOLE:', msg.text()));
    page.on('request', request => console.log('API REQ:', request.method(), request.url()));
    page.on('response', response => console.log('API RES:', response.status(), response.url()));

    // Reset Batman tag settings to default in the database before each test
    await request.post('/api/nfc/tags/041285A2E23E80', {
      data: {
        name: 'Batman',
        arrivalColor: '#10b981',
        departureColor: '#f59e0b',
        icon: 'Shield',
        iconType: 'lucide'
      }
    });

    // Clear active tags and history to ensure E2E test isolation
    await request.post('/api/nfc/clear');

    // Navigate to the frontend page
    await page.goto('/');
  });

  test('should load the dashboard with correct header and connection states', async ({ page }) => {
    // 1. Assert Title is visible
    const title = page.getByRole('heading', { name: 'LEGO Dimensions Toypad Interface' });
    await expect(title).toBeVisible();

    // 2. Assert Status indicators are present
    const hardwareStatus = page.locator('header').getByText(/Mode: MOCK/);
    await expect(hardwareStatus).toBeVisible();

    // 3. Verify all three zones exist on the visualiser
    await expect(page.getByText('Center Pad (Pad 1)').first()).toBeVisible();
    await expect(page.getByText('Left Zone').first()).toBeVisible();
    await expect(page.getByText('Right Zone').first()).toBeVisible();
  });

  test('should simulate NFC tag arrival and departure successfully', async ({ page }) => {
    const cardId = 'CARD-E2E-123';

    // Locate Pad Visualiser card container uniquely
    const padVisualiser = page.locator('.glass-panel-heavy').first();

    // 1. Select Pad 2 (Left Zone) in the simulator
    const pad2Button = page.locator('button', { hasText: 'Pad 2 (Left)' }).first();
    await pad2Button.click();

    // 2. Enter custom Card ID
    const cardInput = page.locator('#card-id-input');
    await cardInput.fill(cardId);

    // 3. Trigger Arrival Scan
    const arrivalBtn = page.getByRole('button', { name: 'Place Tag (Arrival)' });
    await expect(arrivalBtn).toBeEnabled();
    await arrivalBtn.click();

    // 4. Assert that the tag appears in the Visualiser Left Zone (Pad 2)
    const leftZone = padVisualiser.locator('div', { hasText: 'Pad 2' }).first();
    await expect(leftZone.getByText(cardId).first()).toBeVisible();

    // 5. Assert that the tag appears in the Live Activity History
    const historySection = page.locator('div', { hasText: 'Live Activity History' }).first();
    await expect(historySection.getByText(cardId).first()).toBeVisible();
    await expect(historySection.getByText('Scan Arrival').first()).toBeVisible();

    // 6. Trigger Departure Scan
    const departureBtn = page.getByRole('button', { name: 'Remove Tag (Depart)' });
    await departureBtn.click();

    // 7. Assert that the tag is removed from the Visualiser Left Zone (within leftZone specifically)
    await expect(leftZone.getByText(cardId).first()).not.toBeVisible();
    await expect(leftZone.getByText('Empty Zone').first()).toBeVisible();

    // 8. Assert departure was appended to history
    await expect(historySection.getByText('Scan Departure').first()).toBeVisible();
  });

  test('should open customiser modal and update tag settings', async ({ page }) => {
    const batmanPresetId = '041285A2E23E80';

    // Locate Pad Visualiser card container
    const padVisualiser = page.locator('.glass-panel-heavy').first();

    // 1. Select Pad 1 (Center)
    const pad1Button = page.locator('button', { hasText: 'Pad 1 (Center)' }).first();
    await pad1Button.click();

    // 2. Choose character preset for Batman
    const batmanPreset = page.locator('button', { hasText: 'Batman' }).first();
    await batmanPreset.click();

    // 3. Confirm card ID input changed to Batman's preset ID
    const cardInput = page.locator('#card-id-input');
    await expect(cardInput).toHaveValue(batmanPresetId);

    // 4. Place Tag
    await page.getByRole('button', { name: 'Place Tag (Arrival)' }).click();

    // 5. Click the "Open Tag Customiser" button at the bottom of the visualiser
    const openCustomiserBtn = padVisualiser.getByRole('button', { name: 'Open Tag Customiser' });
    await openCustomiserBtn.click();

    // 6. Confirm Modal is open and displaying character information
    const modalTitle = page.getByRole('heading', { name: 'Tag Customiser' });
    await expect(modalTitle).toBeVisible();

    // 7. Select Batman in the first dropdown by option value (Card ID)
    const selectDropdown = page.locator('select').first();
    await selectDropdown.selectOption(batmanPresetId);

    // 8. Wait for the asynchronous fetch to complete and populate name input to 'Batman'
    const nameInput = page.locator('input[placeholder="Enter custom nickname..."]');
    await expect(nameInput).toHaveValue('Batman');

    // 9. Now safely edit and fill the new name, and assert that it has registered (no race conditions)
    await nameInput.fill('Dark Knight E2E');
    await expect(nameInput).toHaveValue('Dark Knight E2E');

    // 10. Save settings
    const saveButton = page.getByRole('button', { name: 'Save Settings' });
    await saveButton.click();

    // 11. Check that it successfully updated in the visualizer and modal is closed
    await expect(modalTitle).not.toBeVisible();
    
    // 12. Confirm the updated name is painted on the page
    await expect(page.getByText('Dark Knight E2E').first()).toBeVisible();
  });

  test('should control simulated LED lights using the Light Simulator', async ({ page }) => {
    // 1. Open diagnostics panel to observe light colors
    const diagnosticsTitle = page.getByRole('heading', { name: 'Pad Light Visualiser' });
    await expect(diagnosticsTitle).toBeVisible();

    // 2. Select Pad 2 in Light Simulator Target Zones
    const lightSimulator = page.locator('div', { hasText: 'Pad Light Simulator' }).first();
    const pad2Button = lightSimulator.locator('button', { hasText: 'Pad 2' }).first();
    await pad2Button.click();

    // 3. Select Electric Purple color preset from list
    const purplePreset = page.locator('button[title="Electric Purple"]').first();
    await purplePreset.click();

    // 4. Click Apply Light
    const applyButton = page.getByRole('button', { name: 'Apply Light' });
    await applyButton.click();

    // 5. Verify LED Diagnostics shows Left color: Electric Purple
    const leftPadDiagnostic = page.locator('div', { hasText: 'Left color' }).first();
    await expect(leftPadDiagnostic.getByText('Electric Purple').first()).toBeVisible();

    // 6. Click Turn Off
    const turnOffButton = page.getByRole('button', { name: 'Turn Off' });
    await turnOffButton.click();

    // 7. Verify LED Diagnostics shows Left Pad: OFF
    await expect(leftPadDiagnostic.getByText('OFF').first()).toBeVisible();
  });

  test('should clear history and states', async ({ page }) => {
    // Locate Pad Visualiser card container
    const padVisualiser = page.locator('.glass-panel-heavy').first();

    // 1. Place a mock tag
    const pad3Button = page.locator('button', { hasText: 'Pad 3 (Right)' }).first();
    await pad3Button.click();
    await page.locator('#card-id-input').fill('CARD-CLEAR-99');
    await page.getByRole('button', { name: 'Place Tag (Arrival)' }).click();

    // 2. Assert there is history recorded
    const historySection = page.locator('div', { hasText: 'Live Activity History' }).first();
    await expect(historySection.getByText('CARD-CLEAR-99').first()).toBeVisible();

    // 3. Click trash icon in history section header to clear
    const trashBtn = historySection.locator('button[title="Clear scan history"]');
    await trashBtn.click();

    // 4. Assert empty message is shown in history
    await expect(page.getByText('No tag events recorded yet').first()).toBeVisible();

    // 5. Assert active zones are empty
    const rightZone = padVisualiser.locator('div', { hasText: 'Pad 3' }).first();
    await expect(rightZone.getByText('Empty Zone').first()).toBeVisible();
  });
});
