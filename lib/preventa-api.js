// preventa-api.js - Cliente de la API de preventa (api/), compartido por Finanzas, Preventa, Taquilla y Boleta.
// Las rutas se calculan desde la ubicación de este archivo (lib/), así funciona desde cualquier página
// y aunque la app esté en una subcarpeta del dominio.

const RAIZ_APP = new URL('../', document.currentScript.src).href;

class PreventaAPI {
    constructor() {
        this.base = new URL('api/', RAIZ_APP).href;
        this.pinKey = 'mambo_preventa_pin_v1';
    }

    getPin() {
        try { return localStorage.getItem(this.pinKey) || ''; } catch (e) { return ''; }
    }

    setPin(pin) {
        try {
            if (pin) localStorage.setItem(this.pinKey, pin);
            else localStorage.removeItem(this.pinKey);
        } catch (e) { /* sin almacenamiento: se pedirá el PIN de nuevo */ }
    }

    async llamar(accion, { params = {}, body = null } = {}) {
        const url = new URL(this.base);
        url.searchParams.set('accion', accion);
        Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

        let resp;
        try {
            resp = await fetch(url, {
                method: body ? 'POST' : 'GET',
                headers: { 'Content-Type': 'application/json', 'X-Pin': this.getPin() },
                body: body ? JSON.stringify(body) : undefined,
                cache: 'no-store'
            });
        } catch (e) {
            const error = new Error('Sin conexión con el servidor.');
            error.sinConexion = true;
            throw error;
        }

        let datos = {};
        try { datos = await resp.json(); } catch (e) { /* respuesta no JSON (p. ej. error del hosting) */ }
        if (!resp.ok) {
            const error = new Error(datos.error || `Error del servidor (${resp.status}).`);
            error.status = resp.status;
            throw error;
        }
        return datos;
    }

    login(pin) {
        this.setPin(pin);
        return this.llamar('login').catch(e => {
            if (e.status === 401 || e.status === 403) this.setPin('');
            throw e;
        });
    }

    // Link público de la boleta (lo que contiene el QR).
    urlBoleta(codigo) {
        return new URL(`boleta/?c=${encodeURIComponent(codigo)}`, RAIZ_APP).href;
    }

    // Acepta el link completo de la boleta o el código suelto (con o sin guion).
    static extraerCodigo(texto) {
        let valor = String(texto || '').trim();
        try {
            const c = new URL(valor).searchParams.get('c');
            if (c) valor = c;
        } catch (e) { /* no es un link */ }
        return valor.toUpperCase().replace(/[^0-9A-Z]/g, '');
    }

    static formatoCodigo(codigo) {
        return codigo && codigo.length === 8 ? `${codigo.slice(0, 4)}-${codigo.slice(4)}` : codigo;
    }
}

window.preventaAPI = new PreventaAPI();
window.PreventaAPI = PreventaAPI;
