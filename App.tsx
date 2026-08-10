// Einstiegspunkt der App: initialisiert die lokale Datenbank und entscheidet,
// ob der Willkommens-Bildschirm oder direkt das Quiz gezeigt wird.
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { PhotoSwipeScreen } from './screens/PhotoSwipeScreen';
import { usePhotoLibraryPermission } from './hooks/usePhotoLibraryPermission';
import { initDatabase } from './db/database';
import { RootStackParamList } from './types/navigation';
import { colors } from './theme';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const { status, isLoading, requestPermission } = usePhotoLibraryPermission();

  // Beim App-Start einmalig die lokale Datenbank öffnen und Tabellen anlegen.
  useEffect(() => {
    initDatabase().catch((error) => {
      console.error('Datenbank konnte nicht initialisiert werden:', error);
    });
  }, []);

  const hasPermission = status === 'granted';

  // Solange der Berechtigungsstatus noch geprüft wird, kurz einen Ladehinweis
  // zeigen – sonst würde das Onboarding kurz aufblitzen, obwohl der Zugriff
  // vielleicht längst erlaubt ist.
  const isCheckingInitially = isLoading && status === 'undetermined';

  return (
    <SafeAreaProvider>
      {isCheckingInitially ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {hasPermission ? (
              // Zugriff erlaubt: direkt ins Quiz, ohne erneutes Onboarding.
              <Stack.Screen name="PhotoSwipe" component={PhotoSwipeScreen} />
            ) : (
              <Stack.Screen name="Onboarding">
                {() => (
                  <OnboardingScreen
                    status={status}
                    isLoading={isLoading}
                    onRequestPermission={requestPermission}
                  />
                )}
              </Stack.Screen>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      )}
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
});
