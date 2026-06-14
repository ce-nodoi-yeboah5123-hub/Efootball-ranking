export const ADMIN_PIN = '2026';
export const START_ELO = 1000;
export const K_FACTOR = 32;

export function eloDelta(ra, rb, result) {
  const ea = 1 / (1 + Math.pow(10, (rb - ra) / 400));
  return Math.round(K_FACTOR * (result - ea));
}
