// Einstiegspunkt der App: baut Navigation auf und initialisiert die lokale Datenbank.
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { PhotoSwipeScreen } from './screens/PhotoSwipeScreen';
import { initDatabase } from './db/database';
import { RootStackParamList } from './types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  // Beim App-Start einmalig die lokale Datenbank öffnen und Tabellen anlegen.
  useEffect(() => {
    initDatabase().catch((error) => {
      console.error('Datenbank konnte nicht initialisiert werden:', error);
    });
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="PhotoSwipe" component={PhotoSwipeScreen} />
        </Stack.Navigator>
      </NavigationContainer>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
