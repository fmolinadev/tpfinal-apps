import { Stack } from "expo-router";

export default function StaffLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="agenda" />
      <Stack.Screen name="escanear" />
      <Stack.Screen name="mantenimiento" />
      <Stack.Screen name="reservas-fijas" />
      <Stack.Screen name="precios" />
    </Stack>
  );
}
