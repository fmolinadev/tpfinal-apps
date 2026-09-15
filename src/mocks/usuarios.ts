import type { Usuario } from "@/tipos/usuario";

export const usuariosMock: Usuario[] = [
  {
    id: "user_jugador_1",
    nombre: "Jugador Demo",
    email: "demo@tpfinal.com",
    telefono: "+5491112345678",
    password: "123456",
    rol: "jugador",
  },
  {
    id: "user_encargado_1",
    nombre: "Encargado Demo",
    email: "encargado@tpfinal.com",
    telefono: "+5491122233344",
    password: "admin123",
    rol: "encargado",
  },
  {
    id: "user_admin_1",
    nombre: "Administrador Demo",
    email: "admin@tpfinal.com",
    telefono: "+5491133344455",
    password: "admin123",
    rol: "administrador",
  },
];
