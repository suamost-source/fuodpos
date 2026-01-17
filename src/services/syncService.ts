
import { createBackup, saveLastSyncTimestamp, loadSettings, restoreBackup } from './storageService';

/**
 * 手机端：从 Firebase 获取最新菜单
 * @param projectIdOverride 可选的 Firebase 项目 ID，用于首次从 QR 码引导同步
 */
export const fetchFromHost = async (projectIdOverride?: string): Promise<{ success: boolean; message: string }> => {
    const settings = loadSettings();
    const config = settings.databaseSync;
    
    // 优先使用传入的 ID，否则使用本地配置
    const targetProjectId = projectIdOverride || config?.firebaseProjectId;

    if (!navigator.onLine) return { success: false, message: "Offline" };
    
    // 如果没有传入 ID 且本地也未启用同步，则跳过
    if (!targetProjectId && (!config?.enabled || config.syncMode !== 'firebase')) {
        return { success: false, message: "Firebase not configured" };
    }

    try {
        // 使用 Firebase REST API 获取名为 'shop_data' 的文档
        const url = `https://firestore.googleapis.com/v1/projects/${targetProjectId}/databases/(default)/documents/configs/shop_data`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error("Cloud data not found");

        const result = await response.json();
        // Firebase REST 返回的格式比较特殊，我们需要提取 fields
        const encodedData = result.fields.payload.stringValue;
        
        const success = restoreBackup(encodedData);
        if (success) {
            saveLastSyncTimestamp(Date.now());
            window.dispatchEvent(new CustomEvent('data-synced'));
            return { success: true, message: "Firebase Synced" };
        }
        return { success: false, message: "Data format error" };
    } catch (e: any) {
        console.error("Sync fetch error:", e);
        return { success: false, message: e.message };
    }
};

/**
 * 电脑端：将最新更改上传到 Firebase
 */
export const performDatabaseSync = async (): Promise<{ success: boolean; message: string }> => {
    const settings = loadSettings();
    const config = settings.databaseSync;
    
    if (!navigator.onLine || !config?.enabled || config.syncMode !== 'firebase' || !config.firebaseProjectId) {
        return { success: false, message: "Sync Disabled or Missing ID" };
    }

    try {
        const backupJson = createBackup();
        const url = `https://firestore.googleapis.com/v1/projects/${config.firebaseProjectId}/databases/(default)/documents/configs/shop_data`;
        
        // 构造 Firebase Firestore 写入格式
        const payload = {
            fields: {
                payload: { stringValue: backupJson },
                lastUpdated: { integerValue: Date.now().toString() },
                terminalId: { stringValue: config.terminalId }
            }
        };

        const response = await fetch(url, {
            method: 'PATCH', // PATCH 会自动创建或更新文档
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || "Firebase Update Failed");
        }

        saveLastSyncTimestamp(Date.now());
        return { success: true, message: "Cloud Updated" };
    } catch (error: any) {
        console.error("Sync perform error:", error);
        return { success: false, message: error.message };
    }
};

export const syncRecordImmediately = async (type: string, data: any) => {
    performDatabaseSync();
};
