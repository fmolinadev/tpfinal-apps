export type RolUsuario = "jugador" | "encargado" | "administrador";

export type LoginInput = {
  email: string;
  password: string;
};

export type RegistroInput = {
  nombre: string;
  email: string;
  telefono: string;
  password: string;
};

export type Usuario = {
  id: string;
  nombre: string;
  email: string;
  telefono: string;
  password?: string;
  rol?: RolUsuario;
  cancelacionesTardias?: number;
  ausencias?: number;
  espaciosFavoritos?: string[];
};
