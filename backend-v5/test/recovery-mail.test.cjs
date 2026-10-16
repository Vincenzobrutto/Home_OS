// Offline only: every transport is injected. No provider credentials or real recipient.
const {test}=require('node:test'),assert=require('node:assert/strict');
const {BrevoRecoveryMail}=require('../dist/auth/recovery-mail');
const config=()=>({enabled:true,apiKey:'offline-secret',senderEmail:'noreply@example.test',senderName:'Dimora',publicOrigin:'https://dimora.example.test'});
const token='a'.repeat(43),recipient='pilot@example.test';
const hasCode=code=>error=>error.code===code;

test('Recovery mail disabled/config invalid: no request leaves the adapter',async()=>{
  let calls=0;const transport=async()=>{calls++;throw Error('Unexpected request');};
  await assert.rejects(new BrevoRecoveryMail({...config(),enabled:false},transport).send('reset_password',recipient,token),hasCode('mail_disabled'));
  for(const patch of [{apiKey:''},{publicOrigin:'http://dimora.example.test'},{publicOrigin:'https://evil.test@dimora.example.test'},{publicOrigin:'https://dimora.example.test/path'},{publicOrigin:'https://dimora.example.test?next=evil'},{senderEmail:'bad'},{senderName:'Header\r\nInjected'}])await assert.rejects(new BrevoRecoveryMail({...config(),...patch},transport).send('reset_password',recipient,token),hasCode('mail_config_invalid'));
  assert.equal(calls,0);
});
test('Recovery mail validates token, purpose and recipient before transport',async()=>{
  let calls=0;const mail=new BrevoRecoveryMail(config(),async()=>{calls++;throw Error();});
  for(const args of [['reset_password','not-email',token],['reset_password',recipient,'bad'],['other',recipient,token]])await assert.rejects(mail.send(...args),hasCode('mail_input_invalid'));
  assert.equal(calls,0);
});
test('Recovery mail sends purpose-specific same-origin fragment link and no documents',async()=>{
  for(const purpose of ['reset_password','verify_email']){
    const calls=[];const mail=new BrevoRecoveryMail(config(),async(url,options)=>{calls.push({url,options});return Response.json({messageId:'offline-message'},{status:201});});
    assert.deepEqual(await mail.send(purpose,recipient,token),{messageId:'offline-message'});
    assert.equal(calls.length,1);assert.equal(calls[0].url,'https://api.brevo.com/v3/smtp/email');assert.equal(calls[0].options.redirect,'error');
    const body=JSON.parse(calls[0].options.body);assert.deepEqual(body.to,[{email:recipient}]);assert(!('attachment' in body));assert(!('bcc' in body));assert(!JSON.stringify(body).includes(config().apiKey));
    const href=body.textContent.split('\n').find(line=>line.startsWith('https:')),url=new URL(href);
    assert.equal(url.origin,config().publicOrigin);assert.equal(url.pathname,purpose==='reset_password'?'/recupera-password':'/verifica-email');assert.equal(url.search,'');assert.equal(new URLSearchParams(url.hash.slice(1)).get('token'),token);
  }
});
test('Provider failures sanitized and never retried automatically',async()=>{
  for(const [status,code] of [[400,'mail_rejected'],[401,'mail_rejected'],[429,'mail_rate_limited'],[500,'mail_delivery_uncertain'],[200,'mail_delivery_uncertain']]){
    let calls=0;const mail=new BrevoRecoveryMail(config(),async()=>{calls++;return Response.json({message:'offline-secret '+token},{status});});
    await assert.rejects(mail.send('reset_password',recipient,token),error=>error.code===code&&!error.message.includes(token)&&!error.message.includes('offline-secret'));assert.equal(calls,1);
  }
});
test('Unknown delivery after network error or invalid success body remains uncertain',async()=>{
  for(const transport of [async()=>{throw Error('offline-secret '+token);},async()=>new Response('invalid',{status:201}),async()=>Response.json({},{status:201})])await assert.rejects(new BrevoRecoveryMail(config(),transport).send('verify_email',recipient,token),hasCode('mail_delivery_uncertain'));
});
test('Local pilot links require explicit opt-in and exact loopback frontend port',async()=>{
  const transport=async()=>Response.json({messageId:'offline-local'},{status:201});
  for(const publicOrigin of ['http://127.0.0.1:5174','http://localhost:5174']){
    await assert.rejects(new BrevoRecoveryMail({...config(),publicOrigin},transport).send('reset_password',recipient,token),hasCode('mail_config_invalid'));
    assert.equal((await new BrevoRecoveryMail({...config(),publicOrigin,allowLocalLinks:true},transport).send('reset_password',recipient,token)).messageId,'offline-local');
  }
  for(const publicOrigin of ['http://192.168.1.2:5174','http://127.0.0.1:3001'])await assert.rejects(new BrevoRecoveryMail({...config(),publicOrigin,allowLocalLinks:true},transport).send('reset_password',recipient,token),hasCode('mail_config_invalid'));
});
