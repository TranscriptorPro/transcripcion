(function() {
        var raw = sessionStorage.getItem('adminSession');
        if (!raw) { window.location.replace('login.html'); return; }
        try {
            var s = JSON.parse(raw);
            if ((s.tokenExpiry && Date.now() > s.tokenExpiry) || (!s.tokenExpiry && (Date.now() - s.timestamp) / 3600000 >= 8)) {
                sessionStorage.removeItem('adminSession');
                window.location.replace('login.html'); return;
            }
        } catch(_) { sessionStorage.removeItem('adminSession'); window.location.replace('login.html'); return; }
        // Auth OK → mostrar contenido
        document.documentElement.style.visibility = 'visible';
    })();
    