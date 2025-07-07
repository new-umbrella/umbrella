import {device, element, by, waitFor, expect} from 'detox';

describe('Profile Creation End to End', () => {
  beforeAll(async () => {
    jest.setTimeout(90000);
    await device.launchApp({
      permissions: {notifications: 'YES'},
      newInstance: true,
    });
  });

  it('should allow user to create a new profile and navigate to main screen', async () => {
     // Since the app starts on the profile screen
     await waitFor(element(by.id('profile-name-input'))).toBeVisible();
     await element(by.id('profile-name-input')).typeText('TestProfile');
     await element(by.id('theme-dark-radio')).tap();  // Assuming these IDs for the inputs/buttons, please update if incorrect.
     await element(by.id('submit-profile-button')).tap();

     // Assuming after creating a profile, the app will take you to another screen
     await waitFor(element(by.id('bottom-navigation-bar'))).toBeVisible();
     await expect(element(by.id('bottom-navigation-bar/home-button'))).toBeVisible();
   });
});
