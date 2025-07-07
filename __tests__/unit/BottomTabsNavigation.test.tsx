import 'react-native';
import React from 'react';
import BottomNavigationBar from '../../src/navigation/BottomNavigationBar';
import {NavigationContainer} from '@react-navigation/native';
import {BottomNavigation} from 'react-native-paper';
import {render} from '@testing-library/react-native';

// Mock the necessary dependencies
jest.mock('react-native-paper', () => {
  const actualRNP = jest.requireActual('react-native-paper');
  return {
    ...actualRNP,
    BottomNavigation: jest.fn(({navigationState, renderScene}) => {
      // Ensure the test navigates to the first screen and renders scene
      const firstIndex = navigationState.routes.findIndex(
        // route => route.key === navigationState.index
        (_, index) => index === 0,
      );
      const key = navigationState.routes[firstIndex].key;
      const scene = renderScene({route: {key}});
      return <div>{scene}</div>;
    }),
  };
});

describe('Bottom Tabs Navigation Tests', () => {
  it('renders without crashing', () => {
    const {toJSON} = render(
      <NavigationContainer>
        <BottomNavigationBar />
      </NavigationContainer>,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('has the correct tabs available', () => {
    const {getByText} = render(
      <NavigationContainer>
        <BottomNavigationBar />
      </NavigationContainer>,
    );
    expect(getByText('Home')).toBeTruthy();
    expect(getByText('Search')).toBeTruthy();
    expect(getByText('Library')).toBeTruthy();
    expect(getByText('Plugins')).toBeTruthy();
    expect(getByText('Settings')).toBeTruthy();
  });
});
