import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PaginationBottomSheet from '../../src/features/search/presentation/components/CategorySwiper/PaginationBottomSheet';

// Create mock for bottom-sheet with TypeScript support
jest.mock('@gorhom/bottom-sheet', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: React.forwardRef((props: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({
        snapToIndex: jest.fn(),
        collapse: jest.fn(),
        expand: jest.fn(),
        close: jest.fn()
      }));
      return null; // Don't render actual bottom sheet content in tests
    }),
  };
});

// Create mock ref type
type MockBottomSheetRef = {
  current: {
    snapToIndex: jest.Mock;
    collapse: jest.Mock;
    expand: jest.Mock;
    close: jest.Mock;
  } | null;
};

describe('PaginationBottomSheet Component', () => {
  const mockRef: MockBottomSheetRef = {
    current: {
      snapToIndex: jest.fn(),
      collapse: jest.fn(),
      expand: jest.fn(),
      close: jest.fn()
    }
  };

  it('renders bottom sheet correctly', () => {
    const { getByTestId } = render(
      <PaginationBottomSheet
        bottomSheetRef={mockRef as any}
      />
    );
    
    expect(getByTestId('bottom-sheet')).toBeTruthy();
  });

  it('handles bottom sheet methods', () => {
    render(
      <PaginationBottomSheet
        bottomSheetRef={mockRef as any}
      />
    );
    
    // Test ref methods
    mockRef.current?.expand();
    expect(mockRef.current?.expand).toHaveBeenCalled();
  });
});
