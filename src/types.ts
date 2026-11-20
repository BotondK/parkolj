import type { ParkingOption } from './logic/recommend';

export type Car = { id: string; plate: string; country: string };

export type Session = {
  option: ParkingOption;
  placeName: string;
  plate: string;
  country: string;
  durationMin: number;
  startedAt: number;
  elapsedSec: number;
  warnedSoon: boolean;
  warnedExpired: boolean;
};

export type HistoryItem = {
  id: string;
  placeName: string;
  zoneId: string | null;
  pricePerHour: number;
  plate: string;
  country: string;
  startedAt: number;
  minutes: number;
  cost: number;
};

export const COUNTRIES = ['H', 'A', 'D', 'SK', 'RO', 'HR', 'SRB', 'UA', 'PL', 'CZ', 'I', 'F', 'GB', '…'];

const HU_PLATE = /^([A-Z]{3}-?\d{3}|[A-Z]{2}-?[A-Z]{2}-?\d{3})$/;

export function plateValid(plate: string, country: string) {
  const p = plate.trim().toUpperCase();
  if (country === 'H') return HU_PLATE.test(p);
  return p.replace(/[^A-Z0-9]/g, '').length >= 2;
}
