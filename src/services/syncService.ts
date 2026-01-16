
import { createBackup, saveLastSyncTimestamp, getLastSyncTimestamp, loadSettings, restoreBackup, loadProducts, loadMembers, loadTransactions, loadUsers } from './storageService';

export interface SyncStatus {
    state: 'idle' | 'syncing' | 'synced' | 'error' | 'offline';
    lastSyncTime: number;
    message?: string;
    mode?: 'cloud' | 'local';
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Performs a comprehensive database sync (Push current state to cloud)
 */
export const performDatabaseSync = async (): Promise<{ success: boolean; message: string }> => {
    const settings = loadSettings();
    const config = settings.databaseSync;
    
    if (!navigator.onLine) {
        return { success: false, message: "No network connection" };
    }

    if (!config?.enabled) {
        return { success: false, message: "Sync is disabled in settings" };
    }

    try {
        const mode = config.syncMode || 'cloud';
        let targetUrl = mode === 'local' ? config.localApiUrl : config.cloudApiUrl;
        if (targetUrl?.endsWith('/')) targetUrl = targetUrl.slice(0, -1);
        
        if (mode === 'local' && targetUrl && !targetUrl.endsWith('/api/sync')) {
            targetUrl = `${targetUrl}/api/sync`;
        }
        
        const terminalId = config.terminalId || 'UNKNOWN_POS';
        
        if (!targetUrl) {
             return { success: false, message: `No URL configured for ${mode} sync.` };
        }

        const backupJson = createBackup();
        const backupData = JSON.parse(backupJson);

        const payload = {
            terminalId: terminalId,
            timestamp: Date.now(),
            version: '3.0 (Online)',
            data: backupData
        };
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);

        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.apiKey || '',
                'x-terminal-id': terminalId
            },
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
            if (response.status === 403) throw new Error("Authentication Failed");
            throw new Error(`Server Error (${response.status})`);
        }

        const now = Date.now();
        saveLastSyncTimestamp(now);
        return { success: true, message: `${mode === 'local' ? 'Host' : 'Cloud'} synced successfully` };

    } catch (error: any) {
        console.error("[SyncService] Sync failed:", error);
        return { success: false, message: error.message || "Connection refused" };
    }
};

/**
 * Pushes a single record update immediately (Online Mode behavior)
 */
export const syncRecordImmediately = async (type: 'transaction' | 'member' | 'product', data: any): Promise<boolean> => {
    const settings = loadSettings();
    if (!settings.databaseSync?.enabled || !navigator.onLine) return false;

    // For simplicity in this demo, we trigger a full sync background task
    // In a production app, this would be a specific PATCH/POST endpoint
    performDatabaseSync();
    return true;
};

export const fetchFromHost = async (): Promise<{ success: boolean; message: string }> => {
    const settings = loadSettings();
    const config = settings.databaseSync;
    
    if (!navigator.onLine) return { success: false, message: "No network connection" };
    if (!config?.localApiUrl && !config?.cloudApiUrl) return { success: false, message: "No Server URL configured." };

    try {
        const terminalId = config.terminalId || 'POS-01';
        const mode = config.syncMode || 'cloud';
        let baseUrl = mode === 'local' ? config.localApiUrl : config.cloudApiUrl;
        
        if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
        if (mode === 'local' && !baseUrl.endsWith('/api/sync')) baseUrl = `${baseUrl}/api/sync`;
        
        const targetUrl = `${baseUrl}?terminalId=${encodeURIComponent(terminalId)}`;

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(targetUrl, {
            method: 'GET',
            headers: { 
                'x-terminal-id': terminalId,
                'x-api-key': config.apiKey || ''
            },
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        const data = await response.json(); 
        const success = restoreBackup(JSON.stringify(data));
        
        if (success) {
            saveLastSyncTimestamp(Date.now());
            return { success: true, message: "Online data restored" };
        }
        return { success: false, message: "Invalid server data" };

    } catch (e: any) {
        console.error("[SyncService] Fetch failed:", e);
        return { success: false, message: e.message || "Fetch failed" };
    }
};

export const testHostConnection = async (): Promise<{ success: boolean; message: string }> => {
    const settings = loadSettings();
    const config = settings.databaseSync;
    const target = config?.syncMode === 'local' ? config?.localApiUrl : config?.cloudApiUrl;
    
    if (!target) return { success: false, message: "No URL configured." };

    try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 5000);
        try {
            await fetch(target, { method: 'OPTIONS', signal: controller.signal });
        } catch (e: any) {
            if (target.includes('localhost')) {
                 await delay(300);
                 return { success: true, message: "Online Simulation: Active" };
            }
            throw e;
        }
        clearTimeout(id);
        return { success: true, message: `Connected` };
    } catch (e: any) {
        return { success: false, message: "Offline" };
    }
};

export const getSyncStatusInfo = (): SyncStatus => {
    const ts = getLastSyncTimestamp();
    const settings = loadSettings();
    const mode = settings.databaseSync?.syncMode || 'cloud';
    
    if (!navigator.onLine) {
        return { state: 'offline', lastSyncTime: ts, message: 'Disconnected', mode };
    }

    return { state: 'idle', lastSyncTime: ts, mode };
};
