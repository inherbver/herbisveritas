/**
 * Mock data for Colissimo API development
 * Based on real Colissimo API response structure
 */

export interface PointRetrait {
  id: string;
  name: string;
  address: string;
  zipCode: string;
  city: string;
  latitude: number;
  longitude: number;
  distance: number; // Distance en mètres
  typeDePoint: string;
  horairesOuverture?: string;
  // Additional fields from real API
  commercial_name?: string;
  company?: string;
  address_1?: string;
  address_2?: string;
  address_3?: string;
  country_code?: string;
  phone?: string;
  service_code?: string;
  pickup_id?: string;
}

// Mock pickup points for different French postal codes
export const mockPickupPoints: Record<string, PointRetrait[]> = {
  "75001": [
    {
      id: "757500",
      pickup_id: "757500",
      name: "BUREAU DE POSTE PARIS LOUVRE",
      commercial_name: "FR - POINT RETRAIT",
      company: "BUREAU DE POSTE PARIS LOUVRE BP",
      address: "52 RUE DU LOUVRE",
      address_1: "52 RUE DU LOUVRE",
      zipCode: "75001",
      city: "PARIS",
      country_code: "FR",
      latitude: 48.861899,
      longitude: 2.340544,
      distance: 150,
      typeDePoint: "Bureau de poste",
      service_code: "BPR",
      phone: "+33142336100",
      horairesOuverture: "Lun-Ven: 8h00-19h00, Sam: 9h00-12h30",
    },
    {
      id: "757501",
      pickup_id: "757501",
      name: "RELAY TABAC DU PALAIS",
      commercial_name: "FR - POINT RELAIS",
      company: "RELAY TABAC DU PALAIS",
      address: "15 RUE DE RIVOLI",
      address_1: "15 RUE DE RIVOLI",
      zipCode: "75001",
      city: "PARIS",
      country_code: "FR",
      latitude: 48.859234,
      longitude: 2.347891,
      distance: 320,
      typeDePoint: "Commerçant",
      service_code: "A2P",
      phone: "+33142601234",
      horairesOuverture: "Lun-Sam: 7h00-20h00, Dim: 8h00-13h00",
    },
    {
      id: "757502",
      pickup_id: "757502",
      name: "CARREFOUR CITY CHÂTELET",
      commercial_name: "FR - POINT RELAIS",
      company: "CARREFOUR CITY CHÂTELET",
      address: "28 RUE SAINT-DENIS",
      address_1: "28 RUE SAINT-DENIS",
      zipCode: "75001",
      city: "PARIS",
      country_code: "FR",
      latitude: 48.860123,
      longitude: 2.349567,
      distance: 450,
      typeDePoint: "Commerçant",
      service_code: "CMT",
      phone: "+33142218765",
      horairesOuverture: "Lun-Sam: 8h00-22h00, Dim: 9h00-20h00",
    },
  ],
  "13001": [
    {
      id: "131000",
      pickup_id: "131000",
      name: "BUREAU DE POSTE MARSEILLE COLBERT",
      commercial_name: "FR - POINT RETRAIT",
      company: "BUREAU DE POSTE MARSEILLE COLBERT BP",
      address: "25 RUE COLBERT",
      address_1: "25 RUE COLBERT",
      zipCode: "13001",
      city: "MARSEILLE",
      country_code: "FR",
      latitude: 43.296482,
      longitude: 5.38142,
      distance: 200,
      typeDePoint: "Bureau de poste",
      service_code: "BPR",
      phone: "+33491915000",
      horairesOuverture: "Lun-Ven: 8h30-18h30, Sam: 8h30-12h00",
    },
    {
      id: "131001",
      pickup_id: "131001",
      name: "TABAC PRESSE VIEUX PORT",
      commercial_name: "FR - POINT RELAIS",
      company: "TABAC PRESSE VIEUX PORT",
      address: "42 QUAI DU PORT",
      address_1: "42 QUAI DU PORT",
      zipCode: "13001",
      city: "MARSEILLE",
      country_code: "FR",
      latitude: 43.295678,
      longitude: 5.374567,
      distance: 380,
      typeDePoint: "Commerçant",
      service_code: "A2P",
      phone: "+33491334455",
      horairesOuverture: "Lun-Sam: 6h30-20h00, Dim: 7h00-13h00",
    },
  ],
  "69001": [
    {
      id: "691000",
      pickup_id: "691000",
      name: "BUREAU DE POSTE LYON TERREAUX",
      commercial_name: "FR - POINT RETRAIT",
      company: "BUREAU DE POSTE LYON TERREAUX BP",
      address: "10 PLACE DES TERREAUX",
      address_1: "10 PLACE DES TERREAUX",
      zipCode: "69001",
      city: "LYON",
      country_code: "FR",
      latitude: 45.767476,
      longitude: 4.833619,
      distance: 180,
      typeDePoint: "Bureau de poste",
      service_code: "BPR",
      phone: "+33472101010",
      horairesOuverture: "Lun-Ven: 9h00-18h00, Sam: 9h00-12h30",
    },
    {
      id: "691001",
      pickup_id: "691001",
      name: "RELAY CROIX-ROUSSE",
      commercial_name: "FR - POINT RELAIS",
      company: "RELAY CROIX-ROUSSE",
      address: "15 RUE DE LA MARTINIÈRE",
      address_1: "15 RUE DE LA MARTINIÈRE",
      zipCode: "69001",
      city: "LYON",
      country_code: "FR",
      latitude: 45.768901,
      longitude: 4.832456,
      distance: 290,
      typeDePoint: "Commerçant",
      service_code: "A2P",
      phone: "+33478282828",
      horairesOuverture: "Lun-Sam: 7h00-19h30",
    },
  ],
  // Default for any other postal code
  default: [
    {
      id: "000001",
      pickup_id: "000001",
      name: "BUREAU DE POSTE CENTRE VILLE",
      commercial_name: "FR - POINT RETRAIT",
      company: "BUREAU DE POSTE CENTRE VILLE BP",
      address: "1 PLACE DE LA POSTE",
      address_1: "1 PLACE DE LA POSTE",
      zipCode: "00000",
      city: "VILLE",
      country_code: "FR",
      latitude: 48.8566,
      longitude: 2.3522,
      distance: 500,
      typeDePoint: "Bureau de poste",
      service_code: "BPR",
      phone: "+33100000000",
      horairesOuverture: "Lun-Ven: 9h00-17h00, Sam: 9h00-12h00",
    },
    {
      id: "000002",
      pickup_id: "000002",
      name: "POINT RELAIS COMMERCE",
      commercial_name: "FR - POINT RELAIS",
      company: "POINT RELAIS COMMERCE",
      address: "10 RUE DU COMMERCE",
      address_1: "10 RUE DU COMMERCE",
      zipCode: "00000",
      city: "VILLE",
      country_code: "FR",
      latitude: 48.8576,
      longitude: 2.3532,
      distance: 750,
      typeDePoint: "Commerçant",
      service_code: "A2P",
      phone: "+33100000001",
      horairesOuverture: "Lun-Sam: 8h00-19h00",
    },
  ],
};

/**
 * Mock Colissimo token response
 */
export const mockColissimoToken = {
  token: "MOCK_TOKEN_" + Date.now(),
  expiresIn: 30 * 60, // 30 minutes in seconds
  testMode: true,
  sandboxMode: true,
};

/**
 * Get mock pickup points for a given postal code
 */
export function getMockPickupPoints(zipCode: string): PointRetrait[] {
  // Try to find specific data for this postal code
  const specificPoints = mockPickupPoints[zipCode];
  if (specificPoints) {
    return specificPoints;
  }

  // Try to find data for the department (first 2 digits of postal code)
  const department = zipCode.substring(0, 2);
  for (const key of Object.keys(mockPickupPoints)) {
    if (key.startsWith(department)) {
      // Return points but update the postal code and city to match request
      return mockPickupPoints[key].map((point) => ({
        ...point,
        zipCode: zipCode,
        city: `MOCK_CITY_${zipCode}`,
      }));
    }
  }

  // Return default points with updated postal code
  return mockPickupPoints.default.map((point) => ({
    ...point,
    zipCode: zipCode,
    city: `MOCK_CITY_${zipCode}`,
  }));
}

/**
 * Simulate API delay
 */
export async function simulateApiDelay(minMs = 200, maxMs = 800): Promise<void> {
  const delay = Math.floor(Math.random() * (maxMs - minMs) + minMs);
  return new Promise((resolve) => setTimeout(resolve, delay));
}
