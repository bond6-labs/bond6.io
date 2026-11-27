// Interactive owner-only connectivity check. The key is never printed or saved.
import { stdin, stdout } from 'node:process';
if (!stdin.isTTY || typeof stdin.setRawMode !== 'function') {
  console.error('Run this command in an interactive terminal.');
  process.exit(1);
}
stdout.write('Paste your Resend API key (input hidden), then press Enter: ');
stdin.setRawMode(true);stdin.resume();stdin.setEncoding('utf8');
const key=await new Promise((resolve,reject)=>{
  let value='';
  stdin.on('data',function onData(chunk){
    for(const ch of chunk){
      if(ch==='\u0003'){stdin.setRawMode(false);stdin.pause();reject(new Error('Cancelled'));return;}
      if(ch==='\r'||ch==='\n'){stdin.removeListener('data',onData);stdin.setRawMode(false);stdin.pause();stdout.write('\n');resolve(value.trim());return;}
      if(ch==='\u007f'||ch==='\b')value=value.slice(0,-1);else value+=ch;
    }
  });
});
if (!key) { console.error('No key entered.'); process.exit(1); }
const payload={from:'Bond6 <digest@bond6.io>',to:['bond6daily@gmail.com'],subject:'Bond6 email delivery test',html:'<p>This is a private Bond6 email delivery test.</p><p>这是一封 Bond6 私人发送测试邮件。</p>'};
try {
  const response=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(payload)});
  if (!response.ok) { console.error(`Resend rejected the test (HTTP ${response.status}). Check the key and verified sending domain in Resend.`);process.exitCode=1; }
  else console.log('Resend accepted the test. Check bond6daily@gmail.com, including spam.');
} catch { console.error('Unable to contact Resend. Check your internet connection and try again.');process.exitCode=1; }
