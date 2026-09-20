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
}
