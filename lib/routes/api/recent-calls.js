const router = require('express').Router();
const sysError = require('../error');
const {DbErrorBadRequest} = require('../../utils/errors');
const {getHomerApiKey, getHomerSipTrace, getHomerPcap} = require('../../utils/homer-utils');
const {getJaegerTrace} = require('../../utils/jaeger-utils');
const Account = require('../../models/account');
const { getS3Object } = require('../../utils/storage-utils');

const parseAccountSid = (url) => {
  const arr = /Accounts\/([^\/]*)/.exec(url);
  if (arr) return arr[1];
};

const parseServiceProviderSid = (url) => {
  const arr = /ServiceProviders\/([^\/]*)/.exec(url);
  if (arr) return arr[1];
};

router.get('/', async(req, res) => {
  const {logger, queryCdrs, queryCdrsSP} = req.app.locals;
  try {
    logger.debug({opts: req.query}, 'GET /RecentCalls');
    const account_sid = parseAccountSid(req.originalUrl);
    const service_provider_sid = account_sid ? null : parseServiceProviderSid(req.originalUrl);
    const {page, count, trunk, direction, days, answered, start, end, filter} = req.query || {};
    if (!page || page < 1) throw new DbErrorBadRequest('missing or invalid "page" query arg');
    if (!count || count < 25 || count > 500) throw new DbErrorBadRequest('missing or invalid "count" query arg');

    if (account_sid) {
      const data = await queryCdrs({
        account_sid,
        page,
        page_size: count,
        trunk,
        direction,
        days,
        answered,
        start: days ? undefined : start,
        end: days ? undefined : end,
        filter
      });
      res.status(200).json(data);
    }
    else {
      const data = await queryCdrsSP({
        service_provider_sid,
        page,
        page_size: count,
        trunk,
        direction,
        days,
        answered,
        start: days ? undefined : start,
        end: days ? undefined : end,
        filter
      });
      res.status(200).json(data);
    }
  } catch (err) {
    sysError(logger, res, err);
  }
});

router.get('/:call_id', async(req, res) => {
  const {logger} = req.app.locals;
  try {
    const token = await getHomerApiKey(logger);
    if (!token) return res.sendStatus(400, {msg: 'Failed to get Homer API token; check server config'});
    const obj = await getHomerSipTrace(logger, token, req.params.call_id);
    if (!obj) {
      logger.info(`/RecentCalls: unable to get sip traces from Homer for ${req.params.call_id}`);
      return res.sendStatus(404);
    }
    res.status(200).json(obj);
  } catch (err) {
    logger.error({err}, '/RecentCalls error retrieving sip traces from homer');
    res.sendStatus(err.statusCode || 500);
  }
});

router.get('/:call_id/:method/pcap', async(req, res) => {
  const {logger} = req.app.locals;
  try {
    const token = await getHomerApiKey(logger);
    if (!token) return res.sendStatus(400, {msg: 'getHomerApiKey: Failed to get Homer API token; check server config'});
    const stream = await getHomerPcap(logger, token, [req.params.call_id], req.params.method);
    if (!stream) {
      logger.info(`getHomerApiKey: unable to get sip traces from Homer for ${req.params.call_id}`);
      return res.sendStatus(404);
    }
    res.set({
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': `attachment; filename=callid-${req.params.call_id}.pcap`
    });
    stream.pipe(res);
  } catch (err) {
    logger.error({err}, 'getHomerApiKey error retrieving sip traces from homer');
    res.sendStatus(err.statusCode || 500);
  }
});

router.get('/trace/:trace_id', async(req, res) => {
  const {logger} = req.app.locals;
  const {trace_id} = req.params;
  try {
    const obj = await getJaegerTrace(logger, trace_id);
    if (!obj) {
      logger.info(`/RecentCalls: unable to get spans from jaeger for ${trace_id}`);
      return res.sendStatus(404);
    }
    res.status(200).json(obj.result);
  } catch (err) {
    logger.error({err}, `/RecentCalls error retrieving jaeger trace ${trace_id}`);
    res.sendStatus(500);
  }
});

router.get('/:call_sid/record/:year/:month/:day/:format', async(req, res) => {
  const {logger} = req.app.locals;
  const {call_sid, year, month, day, format} = req.params;

  try {
    const account_sid = parseAccountSid(req.originalUrl);
    const r = await Account.retrieve(account_sid);
    if (r.length === 0 || !r[0].bucket_credential) return res.sendStatus(404);
    const {bucket_credential} = r[0];
    switch (bucket_credential.vendor) {
      case 'aws_s3':
        const getS3Options  = {
          ...bucket_credential,
          key: `${year}/${month}/${day}/${call_sid}.${format || 'mp3'}`
        };
        const stream = await getS3Object(logger, getS3Options);
        res.set({
          'Content-Type': `audio/${format || 'mp3'}`
        });
        stream.pipe(res);
        break;
      default:
        logger.error(`There is no handler for fetching record from ${bucket_credential.vendor}`);
        return res.sendStatus(500);
    }
  }  catch (err) {
    logger.error({err}, ` error retrieving recording ${call_sid}`);
    res.sendStatus(404);
  }
});
module.exports = router;
