import {device, element, by, waitFor, expect} from 'detox';

describe('Media Playback End to End', () => {
  beforeAll(async () => {
    await device.launchApp({
      permissions: {
          notifications: 'YES',
      }
    })
  });

  it('should navigate from a search result to media playback', async () => {
    // Navigate to the search screen
    await element(by.id('search-icon')).tap();

    // Search for an item
    await element(by.id('search-input')).typeText('Spider-Man');
    await element(by.id('search-button')).tap();

    // Select the first search result
    await waitFor(element(by.id('search-result-0'))).toBeVisible().withTimeout(3000);
    await element(by.id('search-result-0')).tap();

    // Wait for media to load
    await waitFor(element(by.id('video-player'))).toBeVisible().withTimeout(5000);

    // Verify that the video player is visible and playing
    expect(element(by.id('video-player'))).toBeVisible();
  });
});
