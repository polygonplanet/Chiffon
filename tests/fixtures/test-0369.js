const m = import("mod");
import("side-effect");
const u = import.meta.url;
async function load(name) { return await import(name) }