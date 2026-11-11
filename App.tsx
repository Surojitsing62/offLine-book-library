import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import BrowseScreen from './src/screens/Browse';
import DetailsScreen from './src/screens/Details';
import { getDb } from './src/db';
import { colors } from './src/theme';

export type RootStackParamList = {
  Browse: undefined;
  Details: { id: number; title?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const theme = { ...DarkTheme, colors: { ...DarkTheme.colors, background: colors.ink, card: colors.ink, text: colors.paper } };

export default function App() {
  useEffect(() => { getDb(); }, []); // open + migrate early
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={theme}>
        <StatusBar style="light" />
        <Stack.Navigator screenOptions={{ contentStyle: { backgroundColor: colors.ink }, animation: 'fade_from_bottom' }}>
          <Stack.Screen name="Browse" component={BrowseScreen} options={{ headerShown: false }} />
          <Stack.Screen
            name="Details"
            component={DetailsScreen}
            options={{ headerTransparent: true, headerTitle: '', headerTintColor: colors.paper, headerBackTitle: 'Library' }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
