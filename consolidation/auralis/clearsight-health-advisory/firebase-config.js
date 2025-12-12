// Storage Configuration (LocalStorage Implementation)
// Replaces Firebase with browser-based LocalStorage for persistence

class LocalStorageService {
    constructor() {
        console.log("Initializing LocalStorage Service...");
        this.userCollection = 'health_advisory_users';
    }

    // Save user profile
    async saveUserProfile(userId, profile) {
        try {
            const profiles = this._getAllProfiles();
            profiles[userId] = { 
                ...profile, 
                updatedAt: new Date().toISOString() 
            };
            localStorage.setItem(this.userCollection, JSON.stringify(profiles));
            console.log("Profile saved to LocalStorage");
            return { success: true };
        } catch (error) {
            console.error("Error saving profile to LocalStorage:", error);
            throw error;
        }
    }

    // Get user profile
    async getUserProfile(userId) {
        try {
            const profiles = this._getAllProfiles();
            return profiles[userId] || null;
        } catch (error) {
            console.error("Error fetching profile from LocalStorage:", error);
            return null;
        }
    }

    // Login (Anonymous - Mocked)
    async loginAnonymous() {
        console.log("Logging in anonymously (LocalStorage)...");
        // Check for existing ID
        let uid = localStorage.getItem('device_uid');
        if (!uid) {
            // Generate new ID
            uid = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            localStorage.setItem('device_uid', uid);
        }
        
        return {
            uid: uid,
            isAnonymous: true,
            isGuest: false // Treated as a real user, just local
        };
    }

    // Helper: Get all profiles
    _getAllProfiles() {
        try {
            return JSON.parse(localStorage.getItem(this.userCollection) || '{}');
        } catch (e) {
            return {};
        }
    }
}

// Export singleton to match previous API
const firebaseService = new LocalStorageService();
