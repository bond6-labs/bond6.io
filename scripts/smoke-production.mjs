const base=process.env.BOND6_SMOKE_URL??'https://bond6.io';
const expected=process.env.BOND6_EXPECTED_RELEASE;
const paths=['/healthz','/','/zh/','/sources','/zh/sources','/trending','/bond'];
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

for(let attempt=1;attempt<=8;attempt++){
  try{
    const results=await Promise.all(paths.map(async path=>{
      const response=await fetch(new URL(path,base),{redirect:'error'});
      return {path,status:response.status,release:response.headers.get('x-bond6-release')};
    }));
    const failures=results.filter(result=>result.status!==200||(expected&&result.release!==expected));
    if(!failures.length){console.log(`Production verified: ${expected??'release header not required'}`);process.exit(0);}
    console.error(`Attempt ${attempt}:`,failures);
  }catch(error){console.error(`Attempt ${attempt}:`,error.message);}
  if(attempt<8)await wait(5_000);
}
throw new Error('Production smoke test did not observe a healthy expected release.');
