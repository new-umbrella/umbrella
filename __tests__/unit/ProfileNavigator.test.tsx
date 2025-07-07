import 'react-native';
import React from 'react';
import ProfileNavigator from '../../src/features/profile/ProfileNavigator';
import {NavigationContainer} from '@react-navigation/native'; // Ensure correct package
import {render} from '@testing-library/react-native';

// Mock navigation dependencies for stack navigation
jest.mock('@react-navigation/native-stack', () => {
  const actualNav = jest.requireActual('@react-navigation/native-stack');
  return {
    __esModule: true,
    ...actualNav,
    createNativeStackNavigator: jest.fn(() => ({
      Navigator: ({children}) => <>{children}</>, // Mock Navigator itself
      Screen: ({children}) => children, // Children should be a react component/element
    })),
  };
});

describe('ProfileNavigator Tests', () => {
  it('renders without crashing', () => {
    const {toJSON} = render(
      <NavigationContainer>
        <ProfileNavigator />
      </NavigationContainer>
    );
    expect(toJSON()).toBeTruthy();
  });

  it('has the profile screen component', () => {
    // Render with full context navigation
    const {getByText} = render(
      <NavigationContainer>
        <ProfileNavigator />
      </NavigationContainer>,
    );
    // Assuming the profile screen has the text "Create Profile" or similar
    // Adjust the selector if there is a testID available
    expect(getByText('Create Profile')).toBeTruthy();
  });
});
