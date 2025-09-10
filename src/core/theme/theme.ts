import {MD3DarkTheme as DefaultTheme, MD3LightTheme} from 'react-native-paper';

// Material 3 Dark Theme and Light Theme

export const DarkTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#8c56f0',
    secondary: '#4060ff',
    tertiary: '#cc2cce',
    background: 'rgba(0, 0, 0, 1)',
    surface: 'rgba(15, 15, 15, 1)',
    text: '#fff',
    disabled: 'rgba(225, 225, 225, 0.80)',
    placeholder: 'rgba(255, 255, 255, 0.54)',
    backdrop: 'rgba(40, 40, 40, 1)',
    secondaryContainer: '#8c56f080',
    onSurface: '#fff',
    onSurfaceVariant: '#ffffff80',
    onSecondaryContainer: '#fff',
  },
};

export const LightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#8c56f0',
    secondary: '#4060ff',
    tertiary: '#cc2cce',
    background: '#f5f5f5',
    surface: 'rgb(215, 215, 215)',
    text: '#000',
    disabled: 'rgba(25, 25, 25, 0.80)',
    placeholder: 'rgba(0, 0, 0, 0.54)',
    backdrop: 'rgba(185, 185, 185, 1)',
    secondaryContainer: '#8c56f080',
    onSurface: '#000',
    onSurfaceVariant: '#00000080',
    onSecondaryContainer: '#000',
  },
};
