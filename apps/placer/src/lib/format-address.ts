export type NominatimAddress = {
  road?: string;
  suburb?: string;
  neighbourhood?: string;
  quarter?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  postcode?: string;
  country?: string;
};

export function formatAddress(addr: NominatimAddress): string {
  const parts: string[] = [];

  if (addr.road) parts.push(addr.road);

  const neighbourhood = addr.suburb ?? addr.neighbourhood ?? addr.quarter;
  const city = addr.city ?? addr.town ?? addr.village ?? addr.municipality;

  if (addr.postcode && neighbourhood) {
    parts.push(`${addr.postcode} ${neighbourhood}`);
  } else if (addr.postcode && city) {
    parts.push(addr.postcode);
  } else if (neighbourhood) {
    parts.push(neighbourhood);
  }

  if (city) parts.push(city);
  if (addr.country) parts.push(addr.country);

  return parts.join(", ");
}
