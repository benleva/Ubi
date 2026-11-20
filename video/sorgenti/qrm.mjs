import { qrMatrix } from '/home/claude/ubi/qr.js';
console.log(JSON.stringify(qrMatrix(process.argv[2]).map(r => r.map(v => v ? 1 : 0))));
