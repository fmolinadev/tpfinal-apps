import { ResizeMode, Video } from 'expo-av';
import { StyleSheet, Text, View } from 'react-native';

export default function VideoPlayer() {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Video Institucional del Complejo</Text>
      <Video
        source={{ uri: 'https://d23dyxeqlo5psv.cloudfront.net/big_buck_bunny.mp4' }}
        style={styles.video}
        useNativeControls={true} // Esto hace que se vean los botones de play y pausa
        resizeMode={ResizeMode.CONTAIN}
        isLooping={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
    alignItems: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  video: {
    width: 320,
    height: 180,
    backgroundColor: '#000',
    borderRadius: 8,
  },
});