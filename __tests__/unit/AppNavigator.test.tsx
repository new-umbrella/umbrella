import 'react-native';
import React from 'react';
import renderer from 'react-test-renderer';
import ProfileNavigator from '../../src/features/profile/ProfileNavigator';

describe('ProfileNavigator Render Test', () => {
  it('should render without crashing', () => {
    const tree = renderer.create(<ProfileNavigator />).toJSON();
    expect(tree).toBeTruthy();
  });
});
