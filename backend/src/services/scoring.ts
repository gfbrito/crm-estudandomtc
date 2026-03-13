type Temperature = 'hot' | 'warm' | 'cold' | 'inactive';
type LeadStage = 'lead' | 'buyer' | 'recurring' | 'vip';

interface PointTier {
    minValue: number;
    maxValue: number | null;
    basePoints: number;
}

const DEFAULT_TIERS: PointTier[] = [
    { minValue: 0, maxValue: 97, basePoints: 10 },
    { minValue: 98, maxValue: 297, basePoints: 25 },
    { minValue: 298, maxValue: 497, basePoints: 50 },
    { minValue: 498, maxValue: 997, basePoints: 100 },
    { minValue: 998, maxValue: null, basePoints: 200 },
];

export function calculatePoints(amount: number, isRecurring: boolean): number {
    const tier = DEFAULT_TIERS.find(t => amount >= t.minValue && (t.maxValue === null || amount <= t.maxValue));
    if (!tier) return 0;

    let points = tier.basePoints;
    if (isRecurring) {
        points = Math.round(points * 1.5); // 50% bonus
    }
    return points;
}

export function calculateTemperature(points: number, daysSinceLastPurchase: number | null): Temperature {
    const days = daysSinceLastPurchase ?? Infinity;

    if (days <= 30 || points >= 200) return 'hot';
    if (days <= 90 || points >= 50) return 'warm';
    if (days <= 180 || points >= 10) return 'cold';
    return 'inactive';
}

export function calculateStage(purchaseCount: number, totalSpent: number): LeadStage {
    if (purchaseCount >= 5 || totalSpent >= 3000) return 'vip';
    if (purchaseCount >= 2) return 'recurring';
    if (purchaseCount >= 1) return 'buyer';
    return 'lead';
}

export function applyDecay(currentPoints: number, monthsSinceLastPurchase: number): number {
    const DECAY_RATE = 0.1;
    let points = currentPoints;
    for (let i = 0; i < monthsSinceLastPurchase; i++) {
        points = Math.round(points * (1 - DECAY_RATE));
    }
    return Math.max(0, points);
}
