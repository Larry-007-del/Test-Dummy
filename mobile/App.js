import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from './src/screens/LoginScreen';
import CoursesScreen from './src/screens/CoursesScreen';
import StaffScreen from './src/screens/StaffScreen';
import ScanScreen from './src/screens/ScanScreen';
import FeedbackScreen from './src/screens/FeedbackScreen';
import ToastHost from './src/components/ToastHost';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Courses" component={CoursesScreen} />
        <Stack.Screen name="Staff" component={StaffScreen} />
        <Stack.Screen name="Scan" component={ScanScreen} />
        <Stack.Screen name="Feedback" component={FeedbackScreen} />
      </Stack.Navigator>
      <ToastHost />
    </NavigationContainer>
  );
}
