const sanitize = require("./middleware/sanitize");

const req = {};
Object.defineProperty(req, 'query', {
    get() { return { "$ne": 5 }; },
    enumerable: true,
    configurable: true
});

const res = {};

sanitize()(req, res, (err) => {
    if (err) console.error('error', err);
    else console.log('done', req.query);
});
