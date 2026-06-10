/**
 * index.js — AM_Faculty
 *
 * Global polyfills MUST be first, before any other imports.
 * Pattern from Student_BLE/index.js
 */
import 'react-native-url-polyfill/auto';

import {Buffer} from 'buffer';
global.Buffer = Buffer;

import 'react-native-gesture-handler';
import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';

AppRegistry.registerComponent(appName, () => App);
