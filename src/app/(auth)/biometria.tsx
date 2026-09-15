import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { authenticateWithBiometrics, isBiometricSupported } from '@/servicios/auth';

export default function BiometricScreen() {
  const router = useRouter();
  const [status, setStatus] = useState('Verificando disponibilidad...');

  useEffect(() => {
    async function checkBiometry() {
      const supported = await isBiometricSupported();

      if (!supported) {
        setStatus('Biometría no disponible. Puedes continuar con tu sesión alternativa.');
        return;
      }

      setStatus('Usa tu huella o Face ID para entrar.');
      const result = await authenticateWithBiometrics();

      if (result) {
        router.replace('/(jugador)/inicio');
      } else {
        Alert.alert('Acceso no autorizado', 'La autenticación biométrica falló.');
        router.replace('/(auth)/login');
      }
    }

    checkBiometry();
  }, [router]);

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Acceso seguro</Text>
        <Text style={styles.status}>{status}</Text>
        <Pressable style={styles.button} onPress={() => router.replace('/(auth)/login')}>
          <Text style={styles.buttonText}>Continuar con método alternativo</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#eef2ff',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 12,
    color: '#111827',
  },
  status: {
    fontSize: 16,
    textAlign: 'center',
    color: '#475569',
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#4338ca',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
  },
});
