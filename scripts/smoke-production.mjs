const base=process.env.BOND6_SMOKE_URL??'https://bond6.io';
const expected=process.env.BOND6_EXPECTED_RELEASE;
// Verify the canonical public routes. Legacy `/trending` and `/bond` now
// redirect permanently, so treating them as required 200 responses makes a
// successful deployment look like a failed release.
const paths=['/healthz','/','/zh/','/sources','/zh/sources','/focusing','/bonding'];
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));

// A new Worker version normally propagates quickly, but the custom-domain
// edge can briefly serve the prior version or reject a request while it rolls.
// This runs only in CI after a deploy, not on reader traffic.
for(let attempt=1;attempt<=12;attempt++){
  try{
    const results=await Promise.all(paths.map(async path=>{
      const response=await fetch(new URL(path,base),{redirect:'error'});
      return {path,status:response.status,release:response.headers.get('x-bond6-release')};
    }));
    const failures=results.filter(result=>result.status!==200||(expected&&result.release!==expected));
    if(!failures.length){console.log(`Production verified: ${expected??'release header not required'}`);process.exit(0);}
    console.error(`Attempt ${attempt}:`,failures);
  }catch(error){console.error(`Attempt ${attempt}:`,error.message);}
  if(attempt<12)await wait(5_000);
}
throw new Error('Production smoke test did not observe a healthy expected release.');
