const {test}=require('node:test');const assert=require('node:assert/strict');
const card=require('../src/main/resources/static/assets/js/romantic-card.js');
test('photo picker accepts only email-compatible JPG/PNG up to 3 MB',()=>{
    assert.equal(card.validatePhoto({type:'image/jpeg',size:1024}),'');
    assert.ok(card.validatePhoto({type:'image/svg+xml',size:100}));
    assert.ok(card.validatePhoto({type:'image/png',size:4*1024*1024}));
});
test('calendar uses Vietnam midnight',()=>assert.equal(card.vietnamDate(new Date('2026-10-19T17:00:00Z')),'2026-10-20'));
