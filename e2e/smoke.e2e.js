describe('smoke critical flows', () => {
  beforeEach(async () => {
    await device.launchApp({ delete: false, newInstance: true });
  });

  it('opens app and shows auth or tabs root', async () => {
    await expect(element(by.text('Buvijon'))).toBeVisible();
  });

  it('navigates to family tab without crash', async () => {
    const familyTab = element(by.text('Oila'));
    if (await familyTab.isVisible()) {
      await familyTab.tap();
      await expect(element(by.text('Family Tree'))).toBeVisible();
    }
  });
});
