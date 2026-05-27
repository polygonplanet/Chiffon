async function f() { for await (const x of g) {} }
async function h() { for await (x of g) ; }