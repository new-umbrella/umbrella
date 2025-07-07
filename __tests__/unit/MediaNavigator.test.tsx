import 'react-native';
import React from 'react';
import renderer from 'react-test-renderer';
import BottomNavigationBar from '../../src/navigation/BottomNavigationBar';

describe('Media Navigation Tests', () => {
  it('renders media stack without crashing', () => {
    const tree = renderer.create(<BottomNavigationBar />).toJSON();
    expect(tree).toBeTruthy();
  });

  it('matches media navigation snapshot', () => {
    const tree = renderer.create(<BottomNavigationBar />).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
