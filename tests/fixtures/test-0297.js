const rest = { x: 1, y: 2, z: 3 };
const o = { ...rest };
const p = () => { const { a, ...rest } = o };
function f({ a, ...rest }) { return rest }
const g = ({ a, ...rest }) => rest;
const q = () => { const { a, b: { c, ...rest } } = o };