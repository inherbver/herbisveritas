// src/components/domain/colissimo/__tests__/utils.test.ts
import { type PointRetrait } from "../ColissimoWidget";

// Utilitaires de logique métier pour Colissimo
export const ColissimoUtils = {
  /**
   * Calcule la distance entre deux points géographiques (formule de Haversine)
   */
  calculateDistance: (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Rayon de la Terre en km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c * 1000; // Retour en mètres
  },

  /**
   * Trie les points par distance croissante
   */
  sortPointsByDistance: (points: PointRetrait[]): PointRetrait[] => {
    return [...points].sort((a, b) => a.distance - b.distance);
  },

  /**
   * Filtre les points par type
   */
  filterPointsByType: (points: PointRetrait[], type: string): PointRetrait[] => {
    return points.filter((point) => point.typeDePoint === type);
  },

  /**
   * Trouve le point le plus proche
   */
  findNearestPoint: (points: PointRetrait[]): PointRetrait | null => {
    if (points.length === 0) return null;
    return points.reduce((nearest, current) =>
      current.distance < nearest.distance ? current : nearest
    );
  },

  /**
   * Filtre les points dans un rayon donné (en mètres)
   */
  filterPointsWithinRadius: (points: PointRetrait[], maxDistance: number): PointRetrait[] => {
    return points.filter((point) => point.distance <= maxDistance);
  },

  /**
   * Formate les horaires d'ouverture pour l'affichage
   */
  formatOpeningHours: (hours?: string): string => {
    if (!hours) return "Horaires non disponibles";
    return hours.replace(/(\d{1,2}):(\d{2})/g, "$1h$2").replace(/h00/g, "h");
  },

  /**
   * Détermine si un point est ouvert selon l'heure actuelle
   */
  isPointOpen: (point: PointRetrait, _currentTime: Date = new Date()): boolean => {
    if (!point.horairesOuverture) return true; // Assume open if no hours specified

    // Logique simplifiée - en production, il faudrait parser les horaires
    const hours = point.horairesOuverture.toLowerCase();
    if (hours.includes("24h/24") || hours.includes("24/7")) return true;
    if (hours.includes("fermé")) return false;

    return true; // Par défaut, considérer comme ouvert
  },

  /**
   * Génère un identifiant unique pour la sélection
   */
  generateSelectionId: (point: PointRetrait, timestamp?: number): string => {
    const ts = timestamp || Date.now();
    return `${point.id}_${ts}`;
  },

  /**
   * Valide qu'un point contient toutes les données requises
   */
  validatePoint: (point: Partial<PointRetrait>): point is PointRetrait => {
    const required = [
      "id",
      "name",
      "address",
      "zipCode",
      "city",
      "latitude",
      "longitude",
      "distance",
    ];
    return required.every(
      (field) =>
        point[field as keyof PointRetrait] !== undefined &&
        point[field as keyof PointRetrait] !== null &&
        point[field as keyof PointRetrait] !== ""
    );
  },

  /**
   * Formate l'adresse complète pour l'affichage
   */
  formatFullAddress: (point: PointRetrait): string => {
    return `${point.address}, ${point.zipCode} ${point.city}`;
  },

  /**
   * Extrait le type de point lisible
   */
  getReadablePointType: (typeDePoint?: string): string => {
    const types = {
      POST: "Bureau de Poste",
      PICKUP: "Point Pickup",
      LOCKER: "Consigne automatique",
      RELAY: "Relais commerçant",
    };
    return types[typeDePoint as keyof typeof types] || "Point de retrait";
  },
};

describe("ColissimoUtils", () => {
  const mockPoints: PointRetrait[] = [
    {
      id: "POINT_1",
      name: "Point Proche",
      address: "1 Rue Proche",
      zipCode: "75001",
      city: "Paris",
      latitude: 48.8566,
      longitude: 2.3522,
      distance: 100,
      typeDePoint: "POST",
      horairesOuverture: "Lun-Ven 9h-18h",
    },
    {
      id: "POINT_2",
      name: "Point Moyen",
      address: "2 Rue Moyenne",
      zipCode: "75002",
      city: "Paris",
      latitude: 48.8606,
      longitude: 2.3376,
      distance: 500,
      typeDePoint: "PICKUP",
      horairesOuverture: "Lun-Sam 8h-20h",
    },
    {
      id: "POINT_3",
      name: "Point Loin",
      address: "3 Rue Lointaine",
      zipCode: "75003",
      city: "Paris",
      latitude: 48.8629,
      longitude: 2.3631,
      distance: 1200,
      typeDePoint: "LOCKER",
      horairesOuverture: "24h/24, 7j/7",
    },
  ];

  describe("calculateDistance", () => {
    it("should calculate distance between two points", () => {
      // Paris to Marseille approximately
      const parisLat = 48.8566;
      const parisLon = 2.3522;
      const marseilleLat = 43.2965;
      const marseilleLon = 5.3698;

      const distance = ColissimoUtils.calculateDistance(
        parisLat,
        parisLon,
        marseilleLat,
        marseilleLon
      );

      // Should be approximately 660km = 660000m
      expect(distance).toBeGreaterThan(650000);
      expect(distance).toBeLessThan(670000);
    });

    it("should return 0 for identical coordinates", () => {
      const distance = ColissimoUtils.calculateDistance(48.8566, 2.3522, 48.8566, 2.3522);
      expect(distance).toBe(0);
    });
  });

  describe("sortPointsByDistance", () => {
    it("should sort points by distance ascending", () => {
      const sorted = ColissimoUtils.sortPointsByDistance(mockPoints);

      expect(sorted[0].distance).toBe(100);
      expect(sorted[1].distance).toBe(500);
      expect(sorted[2].distance).toBe(1200);
    });

    it("should not mutate original array", () => {
      const originalOrder = [...mockPoints];
      ColissimoUtils.sortPointsByDistance(mockPoints);

      expect(mockPoints).toEqual(originalOrder);
    });

    it("should handle empty array", () => {
      const sorted = ColissimoUtils.sortPointsByDistance([]);
      expect(sorted).toEqual([]);
    });
  });

  describe("filterPointsByType", () => {
    it("should filter points by type", () => {
      const postPoints = ColissimoUtils.filterPointsByType(mockPoints, "POST");
      expect(postPoints).toHaveLength(1);
      expect(postPoints[0].id).toBe("POINT_1");

      const pickupPoints = ColissimoUtils.filterPointsByType(mockPoints, "PICKUP");
      expect(pickupPoints).toHaveLength(1);
      expect(pickupPoints[0].id).toBe("POINT_2");
    });

    it("should return empty array for non-existent type", () => {
      const filtered = ColissimoUtils.filterPointsByType(mockPoints, "NONEXISTENT");
      expect(filtered).toEqual([]);
    });
  });

  describe("findNearestPoint", () => {
    it("should find the nearest point", () => {
      const nearest = ColissimoUtils.findNearestPoint(mockPoints);
      expect(nearest?.id).toBe("POINT_1");
      expect(nearest?.distance).toBe(100);
    });

    it("should return null for empty array", () => {
      const nearest = ColissimoUtils.findNearestPoint([]);
      expect(nearest).toBeNull();
    });
  });

  describe("filterPointsWithinRadius", () => {
    it("should filter points within specified radius", () => {
      const nearbyPoints = ColissimoUtils.filterPointsWithinRadius(mockPoints, 600);
      expect(nearbyPoints).toHaveLength(2);
      expect(nearbyPoints.map((p) => p.id)).toEqual(["POINT_1", "POINT_2"]);

      const veryNearPoints = ColissimoUtils.filterPointsWithinRadius(mockPoints, 200);
      expect(veryNearPoints).toHaveLength(1);
      expect(veryNearPoints[0].id).toBe("POINT_1");
    });

    it("should return empty array if no points within radius", () => {
      const filtered = ColissimoUtils.filterPointsWithinRadius(mockPoints, 50);
      expect(filtered).toEqual([]);
    });
  });

  describe("formatOpeningHours", () => {
    it("should format opening hours correctly", () => {
      expect(ColissimoUtils.formatOpeningHours("9:00-18:00")).toBe("9h-18h");
      expect(ColissimoUtils.formatOpeningHours("Lun-Ven 10:30-19:00")).toBe("Lun-Ven 10h30-19h");
    });

    it("should handle undefined hours", () => {
      expect(ColissimoUtils.formatOpeningHours(undefined)).toBe("Horaires non disponibles");
      expect(ColissimoUtils.formatOpeningHours("")).toBe("Horaires non disponibles");
    });

    it("should preserve already formatted hours", () => {
      expect(ColissimoUtils.formatOpeningHours("24h/24, 7j/7")).toBe("24h/24, 7j/7");
    });
  });

  describe("isPointOpen", () => {
    it("should return true for 24/7 points", () => {
      const alwaysOpen = {
        ...mockPoints[0],
        horairesOuverture: "24h/24, 7j/7",
      };
      expect(ColissimoUtils.isPointOpen(alwaysOpen)).toBe(true);
    });

    it("should return true when no hours specified", () => {
      const noHours = { ...mockPoints[0] };
      delete noHours.horairesOuverture;
      expect(ColissimoUtils.isPointOpen(noHours)).toBe(true);
    });

    it("should return false for explicitly closed points", () => {
      const closed = {
        ...mockPoints[0],
        horairesOuverture: "fermé aujourd'hui",
      };
      expect(ColissimoUtils.isPointOpen(closed)).toBe(false);
    });
  });

  describe("generateSelectionId", () => {
    it("should generate unique selection ID with timestamp", () => {
      const point = mockPoints[0];
      const timestamp = 1640995200000; // Fixed timestamp
      const selectionId = ColissimoUtils.generateSelectionId(point, timestamp);

      expect(selectionId).toBe(`${point.id}_${timestamp}`);
    });

    it("should generate different IDs for same point at different times", () => {
      const point = mockPoints[0];
      const id1 = ColissimoUtils.generateSelectionId(point, 1000);
      const id2 = ColissimoUtils.generateSelectionId(point, 2000);

      expect(id1).not.toBe(id2);
    });
  });

  describe("validatePoint", () => {
    it("should validate complete point", () => {
      expect(ColissimoUtils.validatePoint(mockPoints[0])).toBe(true);
    });

    it("should reject incomplete point", () => {
      const incomplete = { ...mockPoints[0] };
      delete incomplete.name;
      expect(ColissimoUtils.validatePoint(incomplete)).toBe(false);
    });

    it("should reject point with empty required fields", () => {
      const emptyField = { ...mockPoints[0], address: "" };
      expect(ColissimoUtils.validatePoint(emptyField)).toBe(false);
    });
  });

  describe("formatFullAddress", () => {
    it("should format complete address", () => {
      const address = ColissimoUtils.formatFullAddress(mockPoints[0]);
      expect(address).toBe("1 Rue Proche, 75001 Paris");
    });
  });

  describe("getReadablePointType", () => {
    it("should return readable type names", () => {
      expect(ColissimoUtils.getReadablePointType("POST")).toBe("Bureau de Poste");
      expect(ColissimoUtils.getReadablePointType("PICKUP")).toBe("Point Pickup");
      expect(ColissimoUtils.getReadablePointType("LOCKER")).toBe("Consigne automatique");
      expect(ColissimoUtils.getReadablePointType("RELAY")).toBe("Relais commerçant");
    });

    it("should return default for unknown type", () => {
      expect(ColissimoUtils.getReadablePointType("UNKNOWN")).toBe("Point de retrait");
      expect(ColissimoUtils.getReadablePointType(undefined)).toBe("Point de retrait");
    });
  });

  describe("Performance and Edge Cases", () => {
    it("should handle large arrays efficiently", () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => ({
        ...mockPoints[0],
        id: `POINT_${i}`,
        distance: Math.random() * 10000,
      }));

      const start = performance.now();
      const sorted = ColissimoUtils.sortPointsByDistance(largeArray);
      const end = performance.now();

      expect(sorted).toHaveLength(1000);
      expect(end - start).toBeLessThan(50); // Should complete in less than 50ms
    });

    it("should handle special floating point values", () => {
      const specialPoint: PointRetrait = {
        id: "SPECIAL",
        name: "Special Point",
        address: "Special Address",
        zipCode: "00000",
        city: "Special City",
        latitude: 0.0000001,
        longitude: -0.0000001,
        distance: 0.1,
      };

      expect(ColissimoUtils.validatePoint(specialPoint)).toBe(true);
      expect(ColissimoUtils.formatFullAddress(specialPoint)).toBe(
        "Special Address, 00000 Special City"
      );
    });
  });
});
