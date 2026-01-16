
export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  color?: string;
  image?: string; // Optional image URL (Base64)
  video?: string; // Optional video URL (Base64)
  description?: string; // Product details
  barcode?: string; // QR or Barcode string
  addons?: AddonGroup[]; // Modifiers like toppings, size, etc.
  lastUpdated?: number;
  isSynced?: boolean;
  trackInventory?: boolean; // NEW: Toggle strict stock enforcement
  stock?: number; // Current quantity on hand
  minStock?: number; // Threshold for low stock warning
  pointsPrice?: number; // Optional: Custom points cost for redemption (Redeem for free)
  pointsAwarded?: number; // Optional: Custom bonus points earned when purchasing
  isAvailable?: boolean; // Manual toggle for out of stock/availability
  isChefSpecial?: boolean; // NEW: Mark item to appear in Kiosk featured section
}

export interface AddonOption {
  id: string;
  name: string;
  price: number;
}

export interface AddonGroup {
  id: string;
  name: string; // e.g. "Size", "Toppings"
  required: boolean;
  multiple: boolean; // Checkbox vs Radio
  options: AddonOption[];
  parentOptionId?: string; // DEPENDENCY: Only show this group if this Option ID is selected
}

export interface CartItem extends Product {
  quantity: number;
  selectedAddons?: AddonOption[]; // List of selected modifiers
  cartId?: string; // Unique ID for cart item to distinguish same product with different addons
  note?: string; // Item-specific remark/note
  isReward?: boolean; // If true, price is 0 and paid by points
  pointsCost?: number; // Cost in points per unit
}

export interface HeldCart {
    id: string;
    name: string;
    ticketNumber?: string; // Track kiosk ticket ID
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
    stationStatuses?: Record<string, OrderStatus>; // Tracks status per station: 'kitchen', 'drinks', 'bakery'
}

export interface PaymentDetail {
  methodId: string;
  methodName: string;
  amount: number;
}

export type UserRole = 'admin' | 'manager' | 'cashier';

export interface User {
  id: string;
  name: string; // Display Name (e.g. John Doe)
  username: string; // Login ID
  password: string; // Login Password
  role: UserRole;
  isSynced?: boolean;
}

export interface FavoriteOrder {
    id: string;
    name: string; // e.g. "Morning Usual"
    items: CartItem[];
}

export interface Member {
    id: string;
    memberCode?: string; // e.g. MBR-1001
    name: string;
    phone: string;
    email?: string;
    emailVerified?: boolean; // New field for verification status
    isFrozen?: boolean; // New field to temporarily block accounts
    address?: string;
    postcode?: string;
    state?: string;
    customField?: string; // Customizable field 1 (e.g. Tax ID)
    customField2?: string; // Customizable field 2 (e.g. Company)
    points: number;
    birthday?: string; // DD-MM-YYYY
    joinDate: number;
    favorites: FavoriteOrder[];
    notes?: string;
    lastUpdated?: number;
    isSynced?: boolean;
}

export interface Transaction {
  id: string; // Internal Unique ID (Timestamp)
  orderNumber: string; // Human readable custom ID (e.g. INV-1001)
  timestamp: number;
  items: CartItem[];
  subtotal: number;
  discount?: number; // Amount discounted
  couponCode?: string; // Code used
  taxTotal: number;
  total: number;
  currency: string;
  payments: PaymentDetail[]; // Supports split payments
  note?: string;
  cashierId?: string;
  cashierName?: string;
  
  // Membership additions
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
  rate: number; // Percentage
  enabled: boolean;
}

export interface PaymentMethodConfig {
  id: string;
  name: string;
  type: 'cash' | 'card' | 'digital' | 'other';
  enabled: boolean;
  image?: string; // Base64 or URL
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percent' | 'fixed' | 'bogo';
  value: number; // Used for percent/fixed value
  minOrder?: number;
  expiryDate?: string; // YYYY-MM-DD
  enabled: boolean;
  // BOGO specific
  buyQty?: number;
  getQty?: number;
  discountPercent?: number; // 100 for free, 50 for half off
}

export interface AppearanceConfig {
  themeColor: string; // 'blue', 'indigo', 'purple', 'pink', 'red', 'orange', 'green', 'teal', 'slate'
  backgroundColor: string; // 'bg-gray-100', 'bg-white', 'bg-slate-50'
  fontSize: 'text-sm' | 'text-base' | 'text-lg'; // Small, Medium, Large
  inputDensity: 'comfortable' | 'compact';
  textColor: string; // 'text-gray-600', 'text-gray-800', 'text-black'
  inputBackground: string; // 'bg-white', 'bg-gray-50', 'bg-gray-100'
  productIconSize?: 'normal' | 'large' | 'enlarge'; // Icon size in POS view
  layoutMode?: 'desktop' | 'tablet' | 'mobile'; // New: Target device mode
}

export interface LoginScreenConfig {
    customLogo?: string; // Base64 string
    backgroundImage?: string; // Base64 string
    welcomeMessage: string;
    showStoreName: boolean;
}

export interface KioskConfig {
    welcomeMessage: string;
    tagline: string;
    showTagline: boolean;
}

export interface ReceiptConfig {
    logo?: string; // Base64
    showLogo: boolean;
    headerText?: string; // Custom message at top
    footerText?: string; // Custom message at bottom (e.g. Returns Policy)
    showShopName: boolean;
    showAddress: boolean;
    showContact: boolean;
    paperSize: '58mm' | '80mm'; // Thermal paper width
    autoPrint?: boolean; // New field for auto-printing receipts
}

export interface MembershipConfig {
    enabled: boolean;
    earnRate: number; // Points earned per 1 unit of currency (e.g. 1 point per $1)
    redeemRate: number; // Points needed for 1 unit of currency discount (e.g. 100 points = $1)
    minRedeemPoints?: number; // MINIMUM balance to allow any redemption
    maxRedeemPointsPerTx?: number; // MAXIMUM points allowed per order
    maxDiscountPercentageByPoints?: number; // e.g. 50 means points can only pay for 50% of the bill
    enableBirthdayReward: boolean;
    birthdayRewardWindow?: 'day' | 'week' | 'month'; // Duration for reward validity
    birthdayRewardMessage: string;
}

export interface EmailJsConfig {
    serviceId: string;
    templateId: string; // Main receipt template
    verifyTemplateId?: string; // Customer verification template
    publicKey: string;
    customMessage?: string; // Custom message template to be sent as {{message}} variable
}

export interface DatabaseSyncConfig {
    enabled: boolean;
    syncMode: 'cloud' | 'local'; // New: Choose between Internet or LAN
    
    // Cloud Settings
    cloudApiUrl: string;
    apiKey?: string;
    
    // Local Settings
    localApiUrl: string; // e.g., http://192.168.1.100:3000
    
    // Identification
    terminalId: string; // e.g. POS-01, KIOSK-02

    autoSyncInterval: number; // Minutes
    lastSyncTimestamp?: number;
}

export interface Category {
    id: string;
    name: string;
    image?: string; // Base64 image
    parentId?: string; // Supports sub-categories
    showInPos?: boolean; // Toggle for POS view
    showInKiosk?: boolean; // Toggle for Customer Menu
}

export interface ShopSettings {
  shopName: string;
  language: 'en' | 'zh' | 'ms'; // Added Language
  contact: string;
  address: string;
  email: string;
  socialMedia: string;
  defaultOrderNote?: string;
  
  // Product Categories (Customizable) - Now object array
  categories: Category[];

  // Order Numbering
  orderPrefix: string;
  nextOrderNumber: number;

  currency: string;
  taxRates: TaxRateConfig[];
  paymentMethods: PaymentMethodConfig[];
  coupons: Coupon[];
  appearance: AppearanceConfig;
  
  // New Login Config
  loginScreen: LoginScreenConfig;

  // New Kiosk Config
  kiosk: KioskConfig;

  // New Receipt Config
  receipt: ReceiptConfig;

  // Membership Config
  membership: MembershipConfig;
  
  // Custom Member Fields
  enableMemberCustomField1?: boolean;
  memberCustomFieldName?: string; 
  enableMemberCustomField2?: boolean;
  memberCustomField2Name?: string; 
  
  // Email Integration
  emailConfig?: EmailJsConfig;
  
  // Database Sync (Renamed from cloudSync)
  databaseSync?: DatabaseSyncConfig;

  // Global Modifier Templates
  globalAddons: AddonGroup[];

  // New Registration settings
  registrationFormUrl?: string;

  // New Inventory behavior
  hideOutOfStock?: boolean;
}
