import React from 'react';
import {render} from '@testing-library/react-native';
import PluginsNavigator from '../../src/features/plugins/PluginsNavigator';
import BottomNavigationBar from '../../src/navigation/BottomNavigationBar';
import {NavigationContainer} from '@react-navigation/native';

describe('PluginsNavigator Tests', () => {
  it('renders without crashing', () => {
    const {toJSON} = render(
      <NavigationContainer>
        <PluginsNavigator />
      </NavigationContainer>
    );
    expect(toJSON()).toBeTruthy();
  });

  it('should navigate to PluginsNavigator screen from BottomNavigationBar when the relevant tab is pressed', () => {
    const {getByTestId, getByText} = render(
      <NavigationContainer>
        <BottomNavigationBar />
      </NavigationContainer>
    );

    getByText('Plugins').props.onPress();
    expect(getByTestId('plugins-view')).toBeTruthy();
  });
});
