/**
 * AppNavigator.tsx — AM_Faculty
 *
 * Stack navigator: FaceScan → Timetable → BLESession → OTP → Result
 */
import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';

import FaceScanScreen from '../screens/FaceScanScreen';
import TimetableScreen from '../screens/TimetableScreen';
import BLESessionScreen from '../screens/BLESessionScreen';
import OTPScreen from '../screens/OTPScreen';
import ResultScreen from '../screens/ResultScreen';

import type {ConnectedStudent} from '../ble/FacultyBLEModule';

export type ClassInfo = {
  subject: string;
  branch: string;
  semester: string;
  section: string;
  start_time?: string;
  end_time?: string;
};

export type RootStackParamList = {
  FaceScan: undefined;
  Timetable: {uid: string; name: string};
  BLESession: {uid: string; name: string; classInfo: ClassInfo};
  OTP: {uid: string; name: string; classInfo: ClassInfo};
  Result: {
    uid: string;
    name: string;
    classInfo: ClassInfo;
    students: ConnectedStudent[];
  };
};

const Stack = createStackNavigator<RootStackParamList>();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: {backgroundColor: '#0f172a'},
          animationEnabled: true,
        }}
        initialRouteName="FaceScan">
        <Stack.Screen name="FaceScan" component={FaceScanScreen} />
        <Stack.Screen name="Timetable" component={TimetableScreen} />
        <Stack.Screen name="BLESession" component={BLESessionScreen} />
        <Stack.Screen name="OTP" component={OTPScreen} />
        <Stack.Screen name="Result" component={ResultScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
