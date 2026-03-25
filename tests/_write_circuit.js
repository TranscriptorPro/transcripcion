// Helper: writes the new e2e-clinic-owner-full-circuit.js
'use strict';
const fs   = require('fs');
const path = require('path');
const dest = path.join(__dirname, 'e2e-clinic-owner-full-circuit.js');
const src  = path.join(__dirname, '_circuit_new.js');
fs.copyFileSync(src, dest);
console.log('OK: copied', src, '->', dest);
