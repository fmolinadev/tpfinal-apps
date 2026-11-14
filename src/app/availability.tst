import React, { useState } from "react":
import { View, Text, TetInput, TouchableOpacity, StyleSheet, FlatList, Alertt } from "react-native";
import { router } from "expo-router";
import { AuthSessionService } from "../services/authSession";

export default function AvailabilityScreen() {
    const [searchDate, setSearchDate] = useState("");
    const [slots,setSlots] = useState([
        { id: "1", time: "10:00 AM" available: true },
        { id: "2", time: "02:00 PM" available: true },
        { id: "3", time: "06:00 PM" available: false },
    ])
    const handLeReserveClick = async (slotTime: string) => {
      const token = await AuthSessionService.getStoredToken();

      if (!token) {
        Alert.alert(
            "Cuenta requerida",
            "Para confirmar la reserva de las " + slotTime + ", debes iniciar sesión o registrarte.",
            [
                {text: "Cancelar", style: "cancel" },
                {text: "Iniciar Sesión", onPress: () => router.push("/login") }
            ]
        );
      } else {
        Alert.alert("¡Disponible!", "Procediendo a reservar el horario: " + slotTime);
      }
    };

    return (
        <View style={styles.container}>
           <Text style={styles.title}>Consultar Disponibilidad</Text>
           <Text style={styles.subtitle}>No necesitas cuenta para buscar horarios</Text>

           <TextInput
             style={styles.Input}
             placeholder="Ingresa ffecha (ej: 2026-11-20)"
             placeholderTextColor="#888"
             value={searchDate}
             onChangeText={setSearchDate}
          />

          <FlatList
            data={slots}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) =>(
                <View style={styles.slotCard}>
                  <View>
                  <Text style=styles.slotText}>{item.time}</Text>
                  <Text style={{color: item.available ? "#4ade80" : "#f87171" }}>
                    {item.available ? "Disponible" : "Ocupado"}
                  </Text>
                </View>
                {item.available && (
                    <TouchableOpacity
                      style={styles.reserveButton}
                      onPress={() => handLeReserveClick(item.time)}
                    >
                      <Text style={styles.reserveText}>Reservar</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            />
          </View>
        );
}
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#121212" , padding: 20, paddingTop: 60 },
    title: {fontSize: 24, fontweight: "bold" , color: "#fff", marginbottom: 6 },
    subtitle: { fontSize: 14, color: "#aaa", marginBotton: 20 },
    input: { bavkgroundColor: "#1e1e1e" , color: "#fff" , padding: 12, borderRadius: 8, marginBottom: 20, bordeerWidth: 1, boderColor: "#333" },
    slotCard: { flexDirection: "row" , justifyContent: "space-between" , alighItems: "center", backgroundColor: "#1e1e1e", padding: 16, borderRadius: 8, marginBottom: 12},
    slotText: { fontSize: 16, fontWeight: "600", color: "#fff" },
    reserveButton: { backgroundColor: "#3b82f6", paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6 },
    reserveText: { color: "#fff", fontWeigth: "600" }
});