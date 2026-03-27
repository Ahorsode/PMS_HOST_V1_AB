import { useMemo } from 'react';

export function usePoultryStats() {
  const getAgeInDays = (hatchDate: string) => {
    const start = new Date(hatchDate).getTime();
    const now = new Date().getTime(); // Can also use provided timestamp if needed
    return Math.floor((now - start) / (1000 * 60 * 60 * 24));
  };

  const getMortalityPercentage = (totalDead: number, initialQuantity: number) => {
    if (initialQuantity <= 0) return 0;
    return (totalDead / initialQuantity) * 100;
  };

  const calculateFCR = (totalFeedWeight: number, totalFlockWeight: number) => {
    if (totalFlockWeight <= 0) return 0;
    return totalFeedWeight / totalFlockWeight;
  };

  return {
    getAgeInDays,
    getMortalityPercentage,
    calculateFCR,
  };
}
