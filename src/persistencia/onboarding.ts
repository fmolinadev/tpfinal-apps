import * as SecureStore from "expo-secure-store";

const PLAYER_ONBOARDING_KEY_PREFIX = "player_onboarding_seen_v2.";

function onboardingKey(usuarioId: string): string {
  let encodedId = "";
  // Cuatro dígitos hexadecimales por unidad evitan colisiones entre IDs.
  for (let i = 0; i < usuarioId.length; i++) {
    encodedId += usuarioId.charCodeAt(i).toString(16).padStart(4, "0");
  }
  return `${PLAYER_ONBOARDING_KEY_PREFIX}${encodedId}`;
}

export async function hasSeenPlayerOnboarding(
  usuarioId: string,
): Promise<boolean> {
  const visto = await SecureStore.getItemAsync(onboardingKey(usuarioId));
  return visto === "true";
}

export async function markPlayerOnboardingSeen(
  usuarioId: string,
): Promise<void> {
  await SecureStore.setItemAsync(onboardingKey(usuarioId), "true");
}
