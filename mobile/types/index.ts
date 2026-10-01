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
  city: string;
  role: string;
  createdAt: string;
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

export interface MatchItem {
  id: string;
  materialId: string;
  requestId: string;
  score: number;
  reason: string;
  createdAt: string;
  material?: Material;
  request?: MaterialRequest;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  createdAt: string;
  readBy: string[];
}

export interface ConversationItem {
  id: string;
  participantIds: string[];
  matchId: string;
  materialId: string;
  requestId: string;
  createdAt: string;
  updatedAt: string;
  otherUser: { id: string; name: string; avatar?: string };
  material?: Pick<Material, 'id' | 'name' | 'category'>;
  lastMessage?: ChatMessage | null;
  unreadCount?: number;
}
