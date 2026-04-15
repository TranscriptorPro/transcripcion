'use strict';

const DEFAULT_BACKEND = 'https://script.google.com/macros/s/AKfycbzu7xluvXc0vl2P6lp0EaLeppib6wkTICkHqhgRAFjDsk8Lr2RtriA8uD83IwOKyiKXDQ/exec';

async function fetchJson(url, opts = {}) {
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error('HTTP ' + res.status);
    return res.json();
}

async function loginAdmin(options = {}) {
    const base = String(options.base || DEFAULT_BACKEND).trim();
    const user = String(options.user || process.env.ADMIN_USER || 'admin').trim();
    const pass = String(options.pass || process.env.ADMIN_PASS || '').trim();

    if (!pass) {
        throw new Error('ADMIN_PASS is required for admin login');
    }

    const params = new URLSearchParams({
        action: 'admin_login',
        username: user,
        password: pass
    });

    const data = await fetchJson(base + '?' + params.toString(), { redirect: 'follow' });
    if (!data || data.error || !data.sessionToken) {
        throw new Error('Admin login failed: ' + (data && data.error ? data.error : 'missing session token'));
    }

    return {
        sessionToken: data.sessionToken,
        sessionUser: (data.user && data.user.Username) || user,
        sessionNivel: (data.user && data.user.Nivel) || 'admin',
        sessionExpiry: data.tokenExpiry || ''
    };
}

function authParams(session, extra = {}) {
    return {
        sessionToken: session.sessionToken,
        sessionUser: session.sessionUser,
        sessionNivel: session.sessionNivel,
        sessionExpiry: session.sessionExpiry,
        ...extra
    };
}

function authQuery(session, extra = {}) {
    return new URLSearchParams(authParams(session, extra)).toString();
}

module.exports = {
    DEFAULT_BACKEND,
    fetchJson,
    loginAdmin,
    authParams,
    authQuery
};
