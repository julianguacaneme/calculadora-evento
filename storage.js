// storage.js - Mambo Candela Finance Calculator Persistence

class StorageManager {
    constructor() {
        this.configKey = 'mambo_config_v1';
        this.eventsKey = 'mambo_events_v1';
        this.defaultConfig = {
            // Gastos
            costoEnsayo: 75000,
            unidadesPorPaqueteManillas: 200,
            costoPaqueteManillas: 50000,
            reservaBandaPct: 7,
            honorarioRecaudadorPct: 7,
            comisionDatafonoPct: 5,
            costoTransferencia: 9000,
            pagoRodie: 50000,

            // Otros parámetros globales si surgieran
        };
    }

    // --- CONFIGURACIÓN ---
    getConfig() {
        const stored = localStorage.getItem(this.configKey);
        if (!stored) return { ...this.defaultConfig };

        try {
            const parsed = JSON.parse(stored);
            // Fusionar con defaults para asegurar que existen todas las keys si actualizamos versiones
            return { ...this.defaultConfig, ...parsed };
        } catch (e) {
            console.error("Error leyendo configuración local:", e);
            return { ...this.defaultConfig };
        }
    }

    saveConfig(newConfig) {
        try {
            // Validar datos básicos
            const configToSave = {
                costoEnsayo: Number(newConfig.costoEnsayo) || 0,
                unidadesPorPaqueteManillas: Number(newConfig.unidadesPorPaqueteManillas) || 200,
                costoPaqueteManillas: Number(newConfig.costoPaqueteManillas) || 0,
                reservaBandaPct: Number(newConfig.reservaBandaPct) || 0,
                honorarioRecaudadorPct: Number(newConfig.honorarioRecaudadorPct) || 0,
                comisionDatafonoPct: Number(newConfig.comisionDatafonoPct) || 0,
                costoTransferencia: Number(newConfig.costoTransferencia) || 0,
                pagoRodie: Number(newConfig.pagoRodie) || 0,
            };

            localStorage.setItem(this.configKey, JSON.stringify(configToSave));
            return true;
        } catch (e) {
            console.error("Error guardando configuración:", e);
            return false;
        }
    }

    resetConfig() {
        localStorage.removeItem(this.configKey);
        return { ...this.defaultConfig };
    }

    // --- HISTORIAL DE EVENTOS ---
    getEvents() {
        const stored = localStorage.getItem(this.eventsKey);
        if (!stored) return [];
        try {
            return JSON.parse(stored);
        } catch (e) {
            console.error("Error leyendo historial de eventos:", e);
            return [];
        }
    }

    saveEvent(eventData) {
        try {
            const events = this.getEvents();
            // Agregar ID y timestamp si no existen
            const newEvent = {
                id: Date.now().toString(36) + Math.random().toString(36).substr(2),
                savedAt: new Date().toISOString(),
                ...eventData
            };

            // Agregar al inicio de la lista
            events.unshift(newEvent);

            localStorage.setItem(this.eventsKey, JSON.stringify(events));
            return newEvent;
        } catch (e) {
            console.error("Error guardando evento:", e);
            throw e;
        }
    }

    deleteEvent(eventId) {
        try {
            let events = this.getEvents();
            events = events.filter(e => e.id !== eventId);
            localStorage.setItem(this.eventsKey, JSON.stringify(events));
            return true;
        } catch (e) {
            console.error("Error eliminando evento:", e);
            return false;
        }
    }
}

// Exportar instancia global
const storageManager = new StorageManager();
// Si se usa en navegador sin módulos, estará disponible como window.storageManager implícitamente
// o simplemente declarada aquí.
window.storageManager = storageManager;
