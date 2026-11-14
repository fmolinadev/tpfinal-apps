import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity } from 'react-native';

export default function BotonFavorito({ idTurno }: { idTurno: string }) {
  const [esFavorito, setEsFavorito] = useState(false);
  const claveStorage = `@favorito_${idTurno}`;

  useEffect(() => {
    AsyncStorage.getItem(claveStorage).then((valor) => {
      if (valor === 'true') setEsFavorito(true);
    });
  }, []);

  const cambiarFavorito = async () => {
    const nuevoEstado = !esFavorito;
    setEsFavorito(nuevoEstado);
    await AsyncStorage.setItem(claveStorage, nuevoEstado.toString());

    if (nuevoEstado) {
      Alert.alert('¡Favorito guardado!', 'Te avisaremos cuando este turno se libere.');
    } else {
      Alert.alert('Eliminado', 'Quitado de tus favoritos.');
    }
  };

  return (
    <TouchableOpacity 
      style={[styles.boton, esFavorito ? styles.activo : styles.inactivo]} 
      onPress={cambiarFavorito}
    >
      <Text style={styles.texto}>
        {esFavorito ? '⭐ En Favoritos' : '☆ Marcar Favorito'}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  boton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginVertical: 6,
  },
  activo: {
    backgroundColor: '#f39c12',
  },
  inactivo: {
    backgroundColor: '#bdc3c7',
  },
  texto: {
    color: '#fff',
    fontWeight: 'bold',
  },
});