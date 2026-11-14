
import { Stack } from "expo-router";
import {
  SafeAreaProvider,
  SafeAreaView,
} from "react-native-safe-area-context";

import { ConectividadProvider } from "@/components/conectividad";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ConectividadProvider>
        <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen
              name="(auth)"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="(jugador)"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="(staff)"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="(admin)"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="(tabs)"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="espacio/[id]"
              options={{ headerShown: false }}
            />
          </Stack>
        </SafeAreaView>
      </ConectividadProvider>
    </SafeAreaProvider>
  );
}