await: for (;;) break await;
yield: for (let i = 0; i < 10; i++) if (i < 5) continue yield;
const obj = {};
var { await, yield } = obj;
