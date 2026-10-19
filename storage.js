// storage.js - Mambo Candela Finance Calculator Persistence

class StorageManager {
    constructor() {
        this.configKey = 'mambo_config_v1';
        this.eventsKey = 'mambo_events_v1';
        this.taquillaKey = 'mambo_taquilla_v1';
        this.mediosPago = ['Efectivo', 'Bre-B', 'Nequi', 'Daviplata', 'Datáfono'];
        this.defaultConfig = {
            // Gastos
            costoEnsayo: 75000,
            unidadesPorPaqueteManillas: 200,
            costoPaqueteManillas: 50000,
            reservaBandaPct: 7,
            honorarioRecaudadorPct: 7,
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

    // --- TAQUILLA (evento en curso) ---
    // Lo registra el Panel de Taquilla y lo lee el Panel de Finanzas (mismo dominio = mismo localStorage).
    getTaquilla() {
        const vacio = { precioCover: null, registros: [] };
        const stored = localStorage.getItem(this.taquillaKey);
        if (!stored) return vacio;
        try {
            return { ...vacio, ...JSON.parse(stored) };
        } catch (e) {
            console.error("Error leyendo taquilla:", e);
            return vacio;
        }
    }

    saveTaquilla(taquilla) {
        try {
            localStorage.setItem(this.taquillaKey, JSON.stringify(taquilla));
            return true;
        } catch (e) {
            console.error("Error guardando taquilla:", e);
            return false;
        }
    }

    setPrecioCover(precio) {
        const taquilla = this.getTaquilla();
        taquilla.precioCover = precio;
        return this.saveTaquilla(taquilla);
    }

    addRegistroTaquilla(cantidad, medio) {
        const taquilla = this.getTaquilla();
        // El precio se guarda en cada registro; cambiarlo después no altera registros previos.
        const registro = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
            cantidad,
            medio,
            precioUnitario: taquilla.precioCover || 0,
            hora: new Date().toISOString()
        };
        taquilla.registros.push(registro);
        if (!this.saveTaquilla(taquilla)) throw new Error("No se pudo guardar el registro.");
        return registro;
    }

    deleteRegistroTaquilla(registroId) {
        const taquilla = this.getTaquilla();
        taquilla.registros = taquilla.registros.filter(r => r.id !== registroId);
        return this.saveTaquilla(taquilla);
    }

    // Borra los registros pero conserva el precio del cover para el siguiente evento.
    resetTaquilla() {
        const taquilla = this.getTaquilla();
        return this.saveTaquilla({ precioCover: taquilla.precioCover, registros: [] });
    }

    resumenTaquilla() {
        const { registros, precioCover } = this.getTaquilla();
        const resumir = lista => ({
            personas: lista.reduce((sum, r) => sum + r.cantidad, 0),
            recaudado: lista.reduce((sum, r) => sum + r.cantidad * r.precioUnitario, 0)
        });
        const porMedio = {};
        this.mediosPago.forEach(medio => {
            porMedio[medio] = resumir(registros.filter(r => r.medio === medio));
        });
        return {
            precioCover,
            registros: registros.length,
            total: resumir(registros),
            porMedio,
            // Si el precio cambió durante el evento, "personas x precio" no cuadra con lo recaudado.
            preciosDistintos: new Set(registros.map(r => r.precioUnitario)).size > 1
        };
    }
}

// Exportar instancia global
const storageManager = new StorageManager();
// Si se usa en navegador sin módulos, estará disponible como window.storageManager implícitamente
// o simplemente declarada aquí.
window.storageManager = storageManager;
