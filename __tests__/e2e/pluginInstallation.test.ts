import {device, element, by, waitFor, expect} from 'detox';

describe('Plugin Installation End to End', () => {
  beforeAll(async () => {
    await device.launchApp({
      permissions: {
          notifications: 'YES',
      },
    })
  })

  it('should allow user to install a plugin from a provided manifest URL', async () => {    
    // Navigate to the plugin screen
    await element(by.id('plugins-icon')).tap();

    // Open the install plugin dialog
    await element(by.id('install-plugin-button')).tap();

    // Enter manifest URL
    await element(by.id('manifest-url-input')).typeText('http://example.com/manifest.json');

    // Install the plugin
    await element(by.id('install-plugin-confirm-button')).tap();

    // Check that the plugin is installed and added to the list
    await waitFor(element(by.id('plugin-item-0'))).toBeVisible().withTimeout(3000);

    // Verify that the plugin is installed correctly
    expect(element(by.id('plugin-item-0'))).toBeVisible();
  })
})
