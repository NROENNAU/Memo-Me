// Platzhalter-Screen für das spätere Swipe-Quiz.
// Hier entstehen später: Foto-Anzeige, Frage (Wann/Wo/Wer), Swipe-Gesten
// und die Anbindung an die Wikimedia-"On this day"-Fakten.
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionBar } from '../components/ActionBar';

export function PhotoSwipeScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.content}>
        <Text style={styles.placeholder} accessibilityRole="text">
          Foto-Swipe-Quiz folgt in Kürze
        </Text>
      </View>
      <ActionBar />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  placeholder: {
    fontSize: 17,
    textAlign: 'center',
    color: '#444444',
  },
});
