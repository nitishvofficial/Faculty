import 'react-native-gesture-handler/jestSetup';

// Silence the warning: Animated: `useNativeDriver` is not supported...
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

jest.mock('lucide-react-native', () => {
  const React = require('react');
  const { View } = require('react-native');
  return new Proxy(
    {},
    {
      get: (target, prop) => (props) => React.createElement(View, props),
    }
  );
});

jest.mock('react-native-vision-camera', () => ({
  Camera: () => null,
  useCameraDevices: () => ({ back: {} }),
  useFrameProcessor: () => {},
}));

jest.mock('react-native-fs', () => ({
  mkdir: jest.fn(),
  moveFile: jest.fn(),
  copyFile: jest.fn(),
  unlink: jest.fn(() => Promise.resolve()),
  exists: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  MainBundlePath: '',
  CachesDirectoryPath: '',
  DocumentDirectoryPath: '',
  ExternalDirectoryPath: '',
  TemporaryDirectoryPath: '',
}));
