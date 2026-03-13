// Lead Types
export type LeadStage = 'lead' | 'buyer' | 'recurring' | 'vip';
export type Temperature = 'hot' | 'warm' | 'cold' | 'inactive';

export interface Lead {
    id: string;
    name: string;
    primaryEmail: string;
    secondaryEmails: string[];
    whatsapp: string;
    cpf?: string;
    city?: string;
    state?: string;
    address?: string;
    birthDate?: Date | null;
    tags: string[];
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
    origin?: string;
    points: number;
    temperature: Temperature;
    stage: LeadStage;
    lastPurchaseAt?: Date | null;
    totalSpent: number;
    purchaseCount: number;
    createdAt: Date;
    updatedAt: Date;
}

export type TimelineType = 'note' | 'contact' | 'followup' | 'observation' | 'sale' | 'system';

export interface TimelineEntry {
    id: string;
    leadId: string;
    type: TimelineType;
    content: string;
    metadata?: {
        saleId?: string;
        productName?: string;
        amount?: number;
        oldPoints?: number;
        newPoints?: number;
        oldTemperature?: Temperature;
        newTemperature?: Temperature;
        mergedLeadId?: string;
        mergedLeadName?: string;
    };
    createdBy: string;
    createdByName?: string;
    createdAt: Date;
}

// Product Types
export type ProductType = 'digital' | 'physical';
export type ProductStatus = 'active' | 'inactive';

export interface ExternalProductId {
    platform: string;
    productId: string;
    productName: string;
}

export interface Product {
    id: string;
    name: string;
    type: ProductType;
    defaultPrice: number;
    status: ProductStatus;
    externalIds: ExternalProductId[];
    createdAt: Date;
    updatedAt?: Date;
    isSubscription?: boolean;
    subscriptionPeriodDays?: number;
    renewalLink?: string;
}

export type SubscriptionStatus = 'active' | 'expiring_soon' | 'expired' | 'renewed' | 'cancelled';

export interface Subscription {
    id: string;
    leadId: string;
    productId: string;
    productName?: string; // Joined
    status: SubscriptionStatus;
    startDate: Date;
    endDate: Date;
    optedOut: boolean;
    renewalLink?: string;
    createdAt: Date;
    updatedAt: Date;
}

// Sales Types
export type SaleStatus = 'approved' | 'pending' | 'refunded' | 'cancelled';

export interface Sale {
    id: string;
    leadId: string;
    leadName?: string;
    leadEmail?: string;
    productId: string;
    productName?: string;
    transactionId: string;
    platform: string;
    amount: number;
    status: SaleStatus;
    paymentMethod: string;
    pointsAwarded: number;
    purchasedAt: Date;
    createdAt: Date;
}

// Recovery Types
export type RecoveryStatus = 'pending' | 'contacted' | 'recovered' | 'lost';

export interface Recovery {
    id: string;
    leadId: string;
    leadName?: string;
    leadWhatsapp?: string;
    leadEmail?: string;
    productId: string;
    productName?: string;
    transactionId: string;
    platform: string;
    amount: number;
    attemptedAt: Date;
    followUpStatus: RecoveryStatus;
    followUpAt?: Date | null;
    notes: string;
    createdAt: Date;
}

// User Types
export type UserRole = 'master' | 'viewer';

export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    createdAt: Date;
}

// Notification Types
export type NotificationType = 'product_not_found' | 'lead_merge' | 'new_origin' | 'processing_error' | 'product_link';
export type NotificationStatus = 'pending' | 'resolved' | 'dismissed';

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: Record<string, unknown>;
    status: NotificationStatus;
    read: boolean;
    createdAt: Date;
    resolvedAt?: Date | null;
}

// Webhook Types
export interface WebhookMapping {
    id: string;
    originName: string;
    identificationRules: {
        header?: string;
        value?: string;
        bodyField?: string;
    };
    fieldMappings: {
        email: string;
        name: string;
        phone: string;
        product: string;
        productId: string;
        amount: string;
        status: string;
        transactionId: string;
    };
    statusMappings: {
        approved: string[];
        pending: string[];
        refunded: string[];
    };
    createdAt: Date;
    updatedAt?: Date;
}

// CSV Import Types
export interface CSVMapping {
    id: string;
    platform: string;
    name?: string;
    fieldMappings: {
        email: string;
        name: string;
        phone: string;
        productName: string;
        productId: string;
        amount: string;
        status: string;
        transactionId: string;
        purchaseDate: string;
        paymentMethod: string;
    };
    statusMappings: {
        approved: string[];
        pending: string[];
        refunded: string[];
        cancelled: string[];
    };
    createdAt: Date;
    updatedAt?: Date;
}

export interface ImportHistory {
    id: string;
    fileName: string;
    platform: string;
    totalRows: number;
    leadsCreated: number;
    leadsUpdated: number;
    salesImported: number;
    recoveryCreated: number;
    errors: string[];
    importedBy: string;
    importedAt: Date;
}

// Settings Types
export interface PointTier {
    minValue: number;
    maxValue: number | null;
    basePoints: number;
}

export interface PointsSettings {
    tiers: PointTier[];
    recurringBonus: number;
    decayRate: number;
    decayIntervalDays: number;
}

export interface TemperatureSettings {
    hot: { maxDaysSincePurchase: number; minPoints: number };
    warm: { maxDaysSincePurchase: number; minPoints: number };
    cold: { maxDaysSincePurchase: number; minPoints: number };
    inactive: { minDaysSincePurchase: number; maxPoints: number };
}

// Dashboard Types
export interface DashboardMetrics {
    salesToday: { count: number; amount: number };
    salesWeek: { count: number; amount: number };
    salesMonth: { count: number; amount: number };
    recurringBuyersPercent: number;
    recoveryOpportunities: { count: number; amount: number };
    pendingNotifications: number;
}

export interface SalesChartData {
    labels: string[];
    values: number[];
    amounts: number[];
}

export interface ProductDistribution {
    productId: string;
    productName: string;
    count: number;
    amount: number;
}

export interface LeadsByTemperature {
    hot: number;
    warm: number;
    cold: number;
    inactive: number;
}

export interface LeadsByStage {
    lead: number;
    buyer: number;
    recurring: number;
    vip: number;
}

// API Response Types
export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

// Mass Messaging Types
export type MassMessageStatus = 'draft' | 'scheduled' | 'sending' | 'completed' | 'cancelled';

export interface SegmentationFilters {
    temperatures?: Temperature[];
    stages?: LeadStage[];
    productIds?: string[];
    scoreRange?: { min: number; max: number };
    tags?: string[];
    lastPurchaseDays?: { min: number; max: number };
    totalSpentRange?: { min: number; max: number };
    purchaseCountRange?: { min: number; max: number };
    platforms?: string[];
    birthdayMonth?: number; // 1-12 for filtering by birthday month
}

export interface MassMessage {
    id: string;
    title: string;
    content: string;
    scheduledAt: Date;
    status: MassMessageStatus;
    filters: SegmentationFilters;
    recipientCount: number;
    sentCount: number;
    failedCount: number;
    createdBy: string;
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
}

