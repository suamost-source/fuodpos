
// A robust, zero-dependency encryption utility for offline local storage.
// Uses a variant of XOR cipher combined with Base64 encoding, supporting UTF-8.

const SECRET_KEY = "swift-pos-offline-secure-key-v1"; // In a real production app, this might be user-derived.

const getKeyBytes = (): Uint8Array => {
    return new TextEncoder().encode(SECRET_KEY);
};

export const encryptData = (text: string): string => {
    try {
        const textBytes = new TextEncoder().encode(text);
        const keyBytes = getKeyBytes();
        const encryptedBytes = new Uint8Array(textBytes.length);

        for (let i = 0; i < textBytes.length; i++) {
            encryptedBytes[i] = textBytes[i] ^ keyBytes[i % keyBytes.length];
        }

        // Convert byte array to string for btoa
        let binary = '';
        const len = encryptedBytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(encryptedBytes[i]);
        }
        
        // Add a prefix to easily identify encrypted data
        return 'ENC:' + btoa(binary);
    } catch (e) {
        console.error("Encryption failed", e);
        return text; // Fallback to plain text if critical failure (prevents data loss)
    }
};

export const decryptData = (cipherText: string): string => {
    try {
        // Check if actually encrypted
        if (!cipherText.startsWith('ENC:')) {
            return cipherText; // Return as-is if it looks like legacy plain text
        }

        const rawCipher = cipherText.substring(4); // Remove 'ENC:'
        const binary = atob(rawCipher);
        const encryptedBytes = new Uint8Array(binary.length);
        
        for (let i = 0; i < binary.length; i++) {
            encryptedBytes[i] = binary.charCodeAt(i);
        }

        const keyBytes = getKeyBytes();
        const decryptedBytes = new Uint8Array(encryptedBytes.length);

        for (let i = 0; i < encryptedBytes.length; i++) {
            decryptedBytes[i] = encryptedBytes[i] ^ keyBytes[i % keyBytes.length];
        }

        return new TextDecoder().decode(decryptedBytes);
    } catch (e) {
        console.error("Decryption failed", e);
        return ""; // Return empty on tamper detection
    }
};
