const {test} = require('node:test');
const assert = require('node:assert/strict');
const invitation = require('../src/main/resources/static/assets/js/date-invitation.js');
test('uses the Vietnam date at midnight regardless of browser timezone', () => {
    assert.equal(invitation.vietnamDate(new Date('2026-10-17T16:59:59Z')),'2026-10-17');
    assert.equal(invitation.vietnamDate(new Date('2026-10-17T17:00:00Z')),'2026-10-18');
});
test('requires date/time and at least one dining or outing place', () => {
    const values = {date:'2099-10-20',time:'18:30',restaurant:'',outing:'Đi dạo'};
    assert.equal(invitation.validate(values),'');
    assert.ok(invitation.validate({...values,date:''}));
    assert.ok(invitation.validate({...values,outing:' ',restaurant:' '}));
});
