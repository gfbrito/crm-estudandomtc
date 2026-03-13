import { Temperature, LeadStage, PointTier, TemperatureSettings } from '@/types';

// Default point tiers
const DEFAULT_POINT_TIERS: PointTier[] = [
    { minValue: 0, maxValue: 97, basePoints: 10 },
    { minValue: 98, maxValue: 297, basePoints: 25 },
    { minValue: 298, maxValue: 497, basePoints: 50 },
    { minValue: 498, maxValue: 997, basePoints: 100 },
    { minValue: 998, maxValue: null, basePoints: 200 },
];

const DEFAULT_RECURRING_BONUS = 0.5; // 50%

const DEFAULT_TEMPERATURE_SETTINGS: TemperatureSettings = {
    hot: { maxDaysSincePurchase: 30, minPoints: 200 },
    warm: { maxDaysSincePurchase: 90, minPoints: 50 },
    cold: { maxDaysSincePurchase: 180, minPoints: 10 },
    inactive: { minDaysSincePurchase: 180, maxPoints: 10 },
};

export function calculatePoints(
    amount: number,
    isRecurring: boolean,
    tiers: PointTier[] = DEFAULT_POINT_TIERS,
    recurringBonus: number = DEFAULT_RECURRING_BONUS
): number {
    const tier = tiers.find(
        (t) => amount >= t.minValue && (t.maxValue === null || amount <= t.maxValue)
    );

    if (!tier) return 0;

    let points = tier.basePoints;

    if (isRecurring) {
        points = Math.round(points * (1 + recurringBonus));
    }

    return points;
}

export function calculateDecay(
    currentPoints: number,
    decayRate: number,
    monthsSinceLastPurchase: number
): number {
    if (monthsSinceLastPurchase <= 0) return currentPoints;

    let points = currentPoints;
    for (let i = 0; i < monthsSinceLastPurchase; i++) {
        points = Math.round(points * (1 - decayRate));
    }

    return Math.max(0, points);
}

export function calculateTemperature(
    points: number,
    daysSinceLastPurchase: number | null,
    settings: TemperatureSettings = DEFAULT_TEMPERATURE_SETTINGS
): Temperature {
    const days = daysSinceLastPurchase ?? Infinity;

    // Check hot first
    if (days <= settings.hot.maxDaysSincePurchase || points >= settings.hot.minPoints) {
        return 'hot';
    }

    // Check warm
    if (days <= settings.warm.maxDaysSincePurchase || points >= settings.warm.minPoints) {
        return 'warm';
    }

    // Check cold
    if (days <= settings.cold.maxDaysSincePurchase || points >= settings.cold.minPoints) {
        return 'cold';
    }

    // Default to inactive
    return 'inactive';
}

export function calculateStage(
    purchaseCount: number,
    totalSpent: number
): LeadStage {
    // VIP: 5+ purchases OR spent more than R$3,000
    if (purchaseCount >= 5 || totalSpent >= 3000) {
        return 'vip';
    }

    // Recurring: 2+ purchases
    if (purchaseCount >= 2) {
        return 'recurring';
    }

    // Buyer: 1 purchase
    if (purchaseCount >= 1) {
        return 'buyer';
    }

    // Lead: no purchases
    return 'lead';
}

export function getDaysSince(date: Date | null): number | null {
    if (!date) return null;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export function getMonthsSince(date: Date | null): number {
    if (!date) return 0;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30));
}
