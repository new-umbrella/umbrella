import 'react-native';
import React from 'react';
import {render, fireEvent} from '@testing-library/react-native';
import {NavigationContainer} from '@react-navigation/native';
import SearchBar from '../../src/features/search/presentation/components/SearchBar';

describe('SearchBar Component', () => {
  const mockOnSubmitEditing = jest.fn();

  afterEach(() => {
    mockOnSubmitEditing.mockClear();
  });

  it('renders without crashing and displays default title', () => {
    const {toJSON} = render(
      <NavigationContainer>
        <SearchBar onSubmitEditing={mockOnSubmitEditing} />
      </NavigationContainer>
    );

    expect(toJSON()).toBeTruthy();
  });

  it('allows user to input text in search box', () => {
    const {getByPlaceholderText} = render(
      <NavigationContainer>
        <SearchBar onSubmitEditing={mockOnSubmitEditing} />
      </NavigationContainer>
    );

    const searchInput = getByPlaceholderText('Search');
    fireEvent.changeText(searchInput, 'test');
    fireEvent(searchInput, 'onSubmitEditing');

    expect(mockOnSubmitEditing).toHaveBeenCalledWith('test');
  });
});
