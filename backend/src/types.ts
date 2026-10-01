export type UserRole = 'user' | 'business' | 'organization';

export type MaterialCategory =
  | 'Madera'
  | 'Metal'
  | 'Plástico'
  | 'Pintura'
  | 'Herramientas'
  | 'Material eléctrico'
  | 'Construcción'
  | 'Mobiliario'
  | 'Material escolar'
  | 'Otros';

export type MaterialCondition = 'Excelente' | 'Buena' | 'Usada' | 'Necesita reparación';

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  city: string;
  avatar?: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface Material {
  id: string;
  userId: string;
  name: string;
  description: string;
  category: MaterialCategory;
  quantity: number;
  unit: string;
  condition: MaterialCondition;
  location: string;
  latitude?: number;
  longitude?: number;
  availability: 'Disponible' | 'Reservado' | 'Entregado';
  photos: string[];
  createdAt: string;
  updatedAt: string;
  isFeatured?: boolean;
  aiTags?: string[];
}

export interface MaterialRequest {
  id: string;
  userId: string;
  material: string;
  category: MaterialCategory;
  quantity: number;
  unit: string;
  description: string;
  location: string;
  neededBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Favorite {
  id: string;
  userId: string;
  materialId: string;
  createdAt: string;
}

export interface Match {
  id: string;
  materialId: string;
  requestId: string;
  score: number;
  reason: string;
  createdAt: string;
}

export interface Conversation {
  id: string;
  participantIds: string[];
  matchId: string;
  materialId: string;
  requestId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
  readBy: string[];
}

export interface AuthPayload {
  userId: string;
  email: string;
}
