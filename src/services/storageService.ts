
import { Product, Transaction, ShopSettings, User, Member, Category, StockPurchase, PendingOrder, HeldCart } from '../types';
import { INITIAL_PRODUCTS } from '../constants';
import { encryptData, decryptData } from '../utils/security';

const KEYS = {
  PRODUCTS: 'swiftpos_products',
  TRANSACTIONS: 'swiftpos_transactions',
  SETTINGS: 'swiftpos_settings_v3',
  USERS: 'swiftpos_users_v2',
  MEMBERS: 'swiftpos_members_v1',
  LAST_SYNC: 'swiftpos_last_sync',
  STOCK_PURCHASES: 'swiftpos_stock_purchases',
  PENDING_ORDERS: 'swiftpos_pending_orders_v1',
  HELD_CARTS: 'swiftpos_held_carts_v1'
};

const DEFAULT_SETTINGS: ShopSettings = {
  shopName: 'FuodPOS',
  language: 'en',
  contact: '555-0123',
  address: '123 Main St, Cityville',
  email: 'hello@fuodpos.com',
  socialMedia: '@fuodpos',
  defaultOrderNote: 'Thank you for your business!',
  
  categories: [
      { id: 'coffee', name: 'Coffee', showInPos: true, showInKiosk: true },
      { id: 'bakery', name: 'Bakery', showInPos: true, showInKiosk: true },
      { id: 'food', name: 'Food', showInPos: true, showInKiosk: true },
      { id: 'drinks', name: 'Drinks', showInPos: true, showInKiosk: true },
      { id: 'other', name: 'Other', showInPos: true, showInKiosk: true }
  ],

  orderPrefix: 'ORD-',
  nextOrderNumber: 1001,

  currency: '$',
  taxRates: [
    { id: 'tax_1', name: 'VAT', rate: 8, enabled: true }
  ],
  paymentMethods: [
    { id: 'pm_1', name: 'Cash', type: 'cash', enabled: true },
    { id: 'pm_2', name: 'Credit Card', type: 'card', enabled: true },
    { id: 'pm_3', name: 'E-Wallet', type: 'digital', enabled: true }
  ],
  coupons: [],
  appearance: {
    themeColor: 'blue',
    backgroundColor: 'bg-gray-100',
    fontSize: 'text-base',
    inputDensity: 'comfortable',
    textColor: 'text-gray-800',
    inputBackground: 'bg-white',
    productIconSize: 'normal',
    layoutMode: 'desktop'
  },
  loginScreen: {
      welcomeMessage: 'Please sign in to continue',
      showStoreName: true
  },
  receipt: {
      showLogo: false,
      showShopName: true,
      showAddress: true,
      showContact: true,
      headerText: '',
      footerText: 'No refunds on sale items.',
      paperSize: '80mm',
      autoPrint: false
  },
  membership: {
      enabled: true,
      earnRate: 1, // 1 point per $1
      redeemRate: 100, // 100 points = $1
      minRedeemPoints: 0,
      maxRedeemPointsPerTx: 0, 
      maxDiscountPercentageByPoints: 100,
      enableBirthdayReward: true,
      birthdayRewardWindow: 'day',
      birthdayRewardMessage: 'Happy Birthday! Ask for your free treat.'
  },
  enableMemberCustomField1: false,
  memberCustomFieldName: 'Custom Field 1',
  enableMemberCustomField2: false,
  memberCustomField2Name: 'Custom Field 2',
  
  emailConfig: {
      serviceId: '',
      templateId: '', 
      verifyTemplateId: '',
      publicKey: '',
      customMessage: 'Thank you for your purchase! We hope to see you again soon.'
  },
  databaseSync: {
      enabled: false,
      syncMode: 'cloud',
      cloudApiUrl: 'https://api.fuodpos.com/v1/sync',
      localApiUrl: 'http://192.168.1.100:8080/api/sync',
      terminalId: 'POS-01',
      autoSyncInterval: 10,
      lastSyncTimestamp: 0
  },
  globalAddons: [],
  hideOutOfStock: false
};

const DEFAULT_USERS: User[] = [
    { id: 'admin_1', name: 'Administrator', username: 'admin', password: 'password', role: 'admin' }
];

// --- Helper for Secure Storage ---
const setSecureItem = (key: string, data: any) => {
    const json = JSON.stringify(data);
    const encrypted = encryptData(json);
    localStorage.setItem(key, encrypted);
};

const getSecureItem = (key: string): any | null => {
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    const decrypted = decryptData(stored);
    try {
        return JSON.parse(decrypted);
    } catch (e) {
        return null;
    }
};

export const loadProducts = (): Product[] => {
  const products = getSecureItem(KEYS.PRODUCTS);
  if (!products) {
    setSecureItem(KEYS.PRODUCTS, INITIAL_PRODUCTS);
    return INITIAL_PRODUCTS as Product[];
  }
  return products;
};

export const saveProducts = (products: Product[]) => setSecureItem(KEYS.PRODUCTS, products);

export const loadTransactions = (): Transaction[] => getSecureItem(KEYS.TRANSACTIONS) || [];

export const saveTransaction = (transaction: Transaction) => {
  const transactions = loadTransactions();
  transactions.unshift(transaction); 
  setSecureItem(KEYS.TRANSACTIONS, transactions);
};

export const loadStockPurchases = (): StockPurchase[] => getSecureItem(KEYS.STOCK_PURCHASES) || [];

export const saveStockPurchase = (purchase: StockPurchase) => {
    const purchases = loadStockPurchases();
    purchases.unshift(purchase);
    setSecureItem(KEYS.STOCK_PURCHASES, purchases);
};

export const loadSettings = (): ShopSettings => {
  const parsed = getSecureItem(KEYS.SETTINGS);
  if (parsed) return { ...DEFAULT_SETTINGS, ...parsed };
  return DEFAULT_SETTINGS;
};

export const saveSettings = (settings: ShopSettings) => setSecureItem(KEYS.SETTINGS, settings);

export const getLastSyncTimestamp = (): number => {
    const ts = localStorage.getItem(KEYS.LAST_SYNC);
    return ts ? parseInt(ts) : 0;
};

export const saveLastSyncTimestamp = (ts: number) => localStorage.setItem(KEYS.LAST_SYNC, ts.toString());

export const loadUsers = (): User[] => {
    const users = getSecureItem(KEYS.USERS);
    if (!users) {
        setSecureItem(KEYS.USERS, DEFAULT_USERS);
        return DEFAULT_USERS;
    }
    return users;
};

export const saveUsers = (users: User[]) => setSecureItem(KEYS.USERS, users);

export const loadMembers = (): Member[] => getSecureItem(KEYS.MEMBERS) || [];

export const saveMembers = (members: Member[]) => setSecureItem(KEYS.MEMBERS, members);

// --- New Persistence for Temporary App State ---
export const loadPendingOrders = (): PendingOrder[] => getSecureItem(KEYS.PENDING_ORDERS) || [];
export const savePendingOrders = (orders: PendingOrder[]) => setSecureItem(KEYS.PENDING_ORDERS, orders);

export const loadHeldCarts = (): HeldCart[] | null => getSecureItem(KEYS.HELD_CARTS);
export const saveHeldCarts = (carts: HeldCart[]) => setSecureItem(KEYS.HELD_CARTS, carts);

export interface BackupData {
    version: string;
    timestamp: number;
    encrypted: boolean;
    payload: string;
}

interface RawBackupPayload {
    products: Product[];
    transactions: Transaction[];
    settings: ShopSettings;
    users: User[];
    members: Member[];
    stockPurchases: StockPurchase[];
}

export const createBackup = (): string => {
    const rawData: RawBackupPayload = {
        products: loadProducts(),
        transactions: loadTransactions(),
        settings: loadSettings(),
        users: loadUsers(),
        members: loadMembers(),
        stockPurchases: loadStockPurchases()
    };
    const payloadString = JSON.stringify(rawData);
    const encryptedPayload = encryptData(payloadString);
    const exportObject: BackupData = {
        version: '2.5',
        timestamp: Date.now(),
        encrypted: true,
        payload: encryptedPayload
    };
    return JSON.stringify(exportObject, null, 2);
};

export const restoreBackup = (jsonString: string): boolean => {
    try {
        let importData = JSON.parse(jsonString);
        if (importData.terminalId && importData.data) importData = importData.data;

        let rawData: RawBackupPayload;
        if (importData.encrypted && importData.payload) {
            const decryptedString = decryptData(importData.payload);
            rawData = JSON.parse(decryptedString);
        } else {
            rawData = importData as RawBackupPayload;
        }

        if (!rawData.products || !rawData.settings || !rawData.users) return false;

        saveProducts(rawData.products);
        setSecureItem(KEYS.TRANSACTIONS, rawData.transactions || []);
        saveSettings(rawData.settings);
        saveUsers(rawData.users);
        if (rawData.members) saveMembers(rawData.members);
        if (rawData.stockPurchases) setSecureItem(KEYS.STOCK_PURCHASES, rawData.stockPurchases);
        
        return true;
    } catch (e) {
        return false;
    }
};

export const clearAllLocalData = () => {
    Object.values(KEYS).forEach(key => localStorage.removeItem(key));
};
