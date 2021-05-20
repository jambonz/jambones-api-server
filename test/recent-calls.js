const test = require('tape') ;
const fs = require('fs');
const jwt = require('jsonwebtoken');
const ADMIN_TOKEN = '38700987-c7a4-4685-a5bb-af378f9734de';
const authAdmin = {bearer: ADMIN_TOKEN};
const request = require('request-promise-native').defaults({
  baseUrl: 'http://127.0.0.1:3000/v1'
});
const consoleLogger = {debug: console.log, info: console.log, error: console.error}
const {writeCdrs} = require('@jambonz/time-series')(consoleLogger, '127.0.0.1');
const {createServiceProvider, createAccount, deleteObjectBySid} = require('./utils');

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

test('recent calls tests', async(t) => {
  const app = require('../app');
  const jsonKey = fs.readFileSync(`${__dirname}/data/test.json`, {encoding: 'utf8'});
  let sid;
  try {
    let result;
    const service_provider_sid = await createServiceProvider(request);
    const account_sid = await createAccount(request, service_provider_sid);

    const token = jwt.sign({
      account_sid
    }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const authUser = {bearer: token};

    /* write sample cdr data */
    const points = 500;
    const data = [];
    const start = new Date(Date.now() - (30 * 24 * 60 * 60 * 1000));
    const now = new Date();
    const increment = (now.getTime() - start.getTime()) / points;
    for (let i =0 ; i < 500; i++) {
      const attempted_at = new Date(start.getTime() + (i * increment));
      const failed = 0 === i % 5;
      data.push({
        call_sid: 'b6f48929-8e86-4d62-ae3b-64fb574d91f6',
        from: '15083084809',
        to: '18882349999',
        answered:  !failed,
        sip_callid: '685cd008-0a66-4974-b37a-bdd6d9a3c4aa@192.168.1.100',
        sip_status: 200,
        duration: failed ? 0 : 45,
        attempted_at: attempted_at.getTime(),
        answered_at: attempted_at.getTime() + 3000,
        terminated_at: attempted_at.getTime() + 45000,
        termination_reason: 'caller hungup',
        host: "192.168.1.100",
        remote_host: '3.55.24.34',
        account_sid: account_sid,
        direction: 0 === i % 2 ? 'inbound' : 'outbound',
        trunk:  0 === i % 2 ? 'twilio' : 'user'
      });
    }
  
    await writeCdrs(data);
    t.pass('seeded cdr data');
        
    /* query last 7 days */
    result = await request.get(`/Accounts/${account_sid}/RecentCalls?page=1&count=25`, {
      auth: authUser,
      json: true,
    });

    await deleteObjectBySid(request, '/Accounts', account_sid);
    await deleteObjectBySid(request, '/ServiceProviders', service_provider_sid);

    //t.end();
  }
  catch (err) {
    console.error(err);
    t.end(err);
  }
});

