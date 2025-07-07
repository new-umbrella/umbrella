import { NativeModules } from 'react-native';
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

// Mock AsyncStorage with full implementation
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Mock other native modules if needed
NativeModules.AsyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};