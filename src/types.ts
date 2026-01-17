
export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  color?: string;
  image?: string; 
  video?: string; 
  description?: string; 
  barcode?: string; 
  addons?: AddonGroup[]; 
  lastUpdated?: number;
  isSynced?: boolean;
  trackInventory?: boolean; 
  stock?: number; 
  minStock?: number; 
  pointsPrice?: number; 
  pointsAwarded?: number; 
  isAvailable?: boolean; 
  isChefSpecial?: boolean; 
}

export interface AddonOption {
  id: string;
  name: string;
  price: number;
}

export interface AddonGroup {
  id: string;
  name: string; 
  required: boolean;
  multiple: boolean; 
  options: AddonOption[];
  parentOptionId?: string; 
}

export interface CartItem extends Product {
  quantity: number;
  selectedAddons?: AddonOption[]; 
  cartId?: string; 
  note?: string; 
  isReward?: boolean; 
  pointsCost?: number; 
}

export interface HeldCart {
    id: string;
    name: string;
    ticketNumber?: string; 
    items: CartItem[];
    member: Member | null;
    pointsToRedeem: number;
    appliedCoupon: Coupon | null;
    orderNote: string;
    createdAt: number;
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed';

export interface PendingOrder {
    id: string;
    items: CartItem[];
    timestamp: number;
    customerName?: string;
    tableNumber?: string;
    ticketNumber?: string;
    total: number;
    status: OrderStatus;
    stationStatuses?: Record<string, OrderStatus>; 
}

export interface PaymentDetail {
  methodId: string;
  methodName: string;
  amount: number;
}

export type UserRole = 'admin' | 'manager' | 'cashier';

export interface User {
  id: string;
  name: string; 
  username: string; 
  password: string; 
  role: UserRole;
  isSynced?: boolean;
}

export interface FavoriteOrder {
    id: string;
    name: string; 
    items: CartItem[];
}

export interface Member {
    id: string;
    memberCode?: string; 
    name: string;
    phone: string;
    email?: string;
    emailVerified?: boolean; 
    isFrozen?: boolean; 
    address?: string;
    postcode?: string;
    state?: string;
    customField?: string; 
    customField2?: string; 
    points: number;
    birthday?: string; 
    joinDate: number;
    favorites: FavoriteOrder[];
    notes?: string;
    lastUpdated?: number;
    isSynced?: boolean;
}

export interface Transaction {
  id: string; 
  orderNumber: string; 
  timestamp: number;
  items: CartItem[];
  subtotal: number;
  discount?: number; 
  couponCode?: string; 
  taxTotal: number;
  total: number;
  currency: string;
  payments: PaymentDetail[]; 
  note?: string;
  cashierId?: string;
  cashierName?: string;
  memberId?: string;
  memberName?: string;
  pointsEarned?: number;
  pointsRedeemed?: number;
  isSynced?: boolean;
}

export interface StockPurchase {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  unitCost: number;
  supplier?: string;
  timestamp: number;
  isSynced?: boolean;
}

export type ViewState = 'pos' | 'transactions' | 'products' | 'dashboard' | 'settings' | 'members' | 'inventory' | 'menu' | 'kitchen';

export interface TaxRateConfig {
  id: string;
  name: string;
  rate: number; 
  enabled: boolean;
}

export interface PaymentMethodConfig {
  id: string;
  name: string;
  type: 'cash' | 'card' | 'digital' | 'other';
  enabled: boolean;
  image?: string; 
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percent' | 'fixed' | 'bogo';
  value: number; 
  minOrder?: number;
  expiryDate?: string; 
  enabled: boolean;
  buyQty?: number;
  getQty?: number;
  discountPercent?: number; 
}

export interface AppearanceConfig {
  themeColor: string; 
  backgroundColor: string; 
  fontSize: 'text-sm' | 'text-base' | 'text-lg'; 
  inputDensity: 'comfortable' | 'compact';
  textColor: string; 
  inputBackground: string; 
  productIconSize?: 'normal' | 'large' | 'enlarge'; 
  layoutMode?: 'desktop' | 'tablet' | 'mobile'; 
}

export interface LoginScreenConfig {
    customLogo?: string; 
    backgroundImage?: string; 
    welcomeMessage: string;
    showStoreName: boolean;
}

export interface KioskConfig {
    welcomeMessage: string;
    tagline: string;
    showTagline: boolean;
}

export interface ReceiptConfig {
    logo?: string; 
    showLogo: boolean;
    headerText?: string; 
    footerText?: string; 
    showShopName: boolean;
    showAddress: boolean;
    showContact: boolean;
    paperSize: '58mm' | '80mm'; 
    autoPrint?: boolean; 
}

export interface MembershipConfig {
    enabled: boolean;
    earnRate: number; 
    redeemRate: number; 
    minRedeemPoints?: number; 
    maxRedeemPointsPerTx?: number; 
    maxDiscountPercentageByPoints?: number; 
    enableBirthdayReward: boolean;
    birthdayRewardWindow?: 'day' | 'week' | 'month'; 
    birthdayRewardMessage: string;
}

export interface EmailJsConfig {
    serviceId: string;
    templateId: string; 
    verifyTemplateId?: string; 
    publicKey: string;
    customMessage?: string; 
}

export interface DatabaseSyncConfig {
    enabled: boolean;
    syncMode: 'cloud' | 'local' | 'firebase'; // 增加 Firebase 模式
    
    // Cloud Settings
    cloudApiUrl: string;
    apiKey?: string;
    
    // Firebase Specific
    firebaseApiKey?: string;
    firebaseProjectId?: string;
    firebaseAppId?: string;
    
    // Local Settings
    localApiUrl: string; 
    
    // Identification
    terminalId: string; 

    autoSyncInterval: number; 
    lastSyncTimestamp?: number;
}

export interface Category {
    id: string;
    name: string;
    image?: string; 
    parentId?: string; 
    showInPos?: boolean; 
    showInKiosk?: boolean; 
}

export interface ShopSettings {
  shopName: string;
  language: 'en' | 'zh' | 'ms'; 
  contact: string;
  address: string;
  email: string;
  socialMedia: string;
  defaultOrderNote?: string;
  categories: Category[];
  orderPrefix: string;
  nextOrderNumber: number;
  currency: string;
  taxRates: TaxRateConfig[];
  paymentMethods: PaymentMethodConfig[];
  coupons: Coupon[];
  appearance: AppearanceConfig;
  loginScreen: LoginScreenConfig;
  kiosk: KioskConfig;
  receipt: ReceiptConfig;
  membership: MembershipConfig;
  enableMemberCustomField1?: boolean;
  memberCustomFieldName?: string; 
  enableMemberCustomField2?: boolean;
  memberCustomField2Name?: string; 
  emailConfig?: EmailJsConfig;
  databaseSync?: DatabaseSyncConfig;
  globalAddons: AddonGroup[];
  registrationFormUrl?: string;
  hideOutOfStock?: boolean;
}
