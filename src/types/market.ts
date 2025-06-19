// Représente une instance unique d'un marché, avec une date spécifique.
// Sera généré à partir de RecurringMarketInfo.
export interface MarketInfo {
  image?: string;
  id: string;
  name: string;
  date: string; // Format ISO YYYY-MM-DD
  startTime: string;
  endTime: string;
  city: string;
  address?: string;
  description?: string;
  gpsLink: string;
  heroImage?: string;
}

// Représente les informations d'un marché récurrent.
export interface RecurringMarketInfo {
  id: string; // Identifiant pour le type de marché, ex: "marche-portiragnes"
  name: string;
  startDate: string; // Date de début de la période (YYYY-MM-DD)
  endDate: string; // Date de fin de la période (YYYY-MM-DD)
  dayOfWeek: number; // Jour de la semaine (0 = Dimanche, 1 = Lundi, ..., 6 = Samedi)
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  city: string;
  address?: string;
  description?: string;
  gpsLink: string;
  heroImage?: string;
}
