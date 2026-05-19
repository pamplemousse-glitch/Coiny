import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { configureNotificationHandler } from '@/services/notifications';

export const unstable_settings = {
  anchor: '(tabs)',
};

// Register the foreground notification handler once, at app start.
configureNotificationHandler();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="goals" options={{ title: 'Goals' }} />
        <Stack.Screen name="link-bank" options={{ title: 'Link a bank' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
