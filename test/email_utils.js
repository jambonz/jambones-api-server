const test = require('tape');
const {emailSimpleText} = require('../lib/utils/email-utils');
const bent = require('bent');
const getJSON = bent('json')
const logger = {
  debug: () =>{},
  info: () => {}
}

test('email-test', async(t) => {
  // Prepare env:
  process.env.CUSTOM_EMAIL_VENDOR_URL = 'http://127.0.0.1:3101/custom_email_vendor';
  process.env.CUSTOM_EMAIL_VENDOR_USERNAME = 'USERNAME';
  process.env.CUSTOM_EMAIL_VENDOR_PASSWORD = 'PASSWORD';

  await emailSimpleText(logger, 'test@gmail.com', 'subject', 'body text');

  const obj = await getJSON(`http://127.0.0.1:3101/lastRequest/custom_email_vendor`);
  t.ok(obj.headers['Content-Type'] == 'application/json');
  t.ok(obj.headers.Authorization == 'Basic VVNFUk5BTUU6UEFTU1dPUkQ=');
  t.ok(obj.body.from == 'jambonz Support <support@jambonz.org>');
  t.ok(obj.body.to == 'test@gmail.com');
  t.ok(obj.body.subject == 'subject');
  t.ok(obj.body.text == 'body text');

  process.env.CUSTOM_EMAIL_VENDOR_URL = null;
  process.env.CUSTOM_EMAIL_VENDOR_USERNAME = null;
  process.env.CUSTOM_EMAIL_VENDOR_PASSWORD = null;
});