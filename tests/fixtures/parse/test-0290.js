async function f() { await x }
async function g() { return await x + 1 }
async function h() { let y = await foo(); }
async function i() { await await x }