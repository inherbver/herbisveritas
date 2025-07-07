// @/lib/countries.ts

export interface Country {
  code: string;
  name: string;
}

// Option 2: Structure multilingue (si vous supportez plusieurs langues)
export const countries = {
  FR: [
    { code: "FR", name: "France" },
    { code: "AD", name: "Andorre" },
    { code: "BE", name: "Belgique" },
    { code: "CH", name: "Suisse" },
    { code: "DE", name: "Allemagne" },
    { code: "ES", name: "Espagne" },
    { code: "GB", name: "Royaume-Uni" },
    { code: "IT", name: "Italie" },
    { code: "LU", name: "Luxembourg" },
    { code: "MC", name: "Monaco" },
    { code: "NL", name: "Pays-Bas" },
    { code: "PT", name: "Portugal" },
    { code: "US", name: "États-Unis" },
    { code: "CA", name: "Canada" },
    { code: "DZ", name: "Algérie" },
    { code: "MA", name: "Maroc" },
    { code: "TN", name: "Tunisie" },
  ],
  EN: [
    { code: "FR", name: "France" },
    { code: "AD", name: "Andorra" },
    { code: "BE", name: "Belgium" },
    { code: "CH", name: "Switzerland" },
    { code: "DE", name: "Germany" },
    { code: "ES", name: "Spain" },
    { code: "GB", name: "United Kingdom" },
    { code: "IT", name: "Italy" },
    { code: "LU", name: "Luxembourg" },
    { code: "MC", name: "Monaco" },
    { code: "NL", name: "Netherlands" },
    { code: "PT", name: "Portugal" },
    { code: "US", name: "United States" },
    { code: "CA", name: "Canada" },
    { code: "DZ", name: "Algeria" },
    { code: "MA", name: "Morocco" },
    { code: "TN", name: "Tunisia" },
  ],
} as const;

export type CountriesStructure = typeof countries;
