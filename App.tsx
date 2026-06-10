/**
 * App.tsx — AM_Faculty
 *
 * Root component. Mounts gesture handler + safe area + navigator.
 * Pattern from Student_BLE/App.js
 */
import React from 'react';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import 'react-native-url-polyfill/auto';
import AppNavigator from './src/navigation/AppNavigator';

export default function App() {
  return (
    <GestureHandlerRootView style={{flex: 1}}>
      <SafeAreaProvider>
        <AppNavigator />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
