module.exports=function(){const make=(n)=>{return{v:n}}
const arr=[1,2,3]
let a=make(5)
let b=arr[1]
a.v++
let c={v:a.v}
let d=c.v
++b
const f=function(){return arr[0]}
let e=f()
--e
let g=arr[2]
g--
return a.v===6&&b===3&&c.v===6&&d===6&&e===0&&g===2}
