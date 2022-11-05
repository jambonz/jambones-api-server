const router = require('express').Router();
const User = require('../../models/user');
const jwt = require('jsonwebtoken');
const {DbErrorBadRequest} = require('../../utils/errors');
const {generateHashedPassword, verifyPassword} = require('../../utils/password-utils');
const {promisePool} = require('../../db');
const {decrypt} = require('../../utils/encrypt-decrypt');
const sysError = require('../error');
const retrieveMyDetails = `SELECT * 
FROM users user
JOIN accounts AS account ON account.account_sid = user.account_sid 
LEFT JOIN service_providers as sp ON account.service_provider_sid = sp.service_provider_sid  
WHERE user.user_sid = ?`;
const retrieveSql = 'SELECT * from users where user_sid = ?';
const retrieveProducts = `SELECT * 
FROM account_products 
JOIN products ON account_products.product_sid = products.product_sid
JOIN account_subscriptions ON account_products.account_subscription_sid = account_subscriptions.account_subscription_sid
WHERE account_subscriptions.account_sid = ?
AND account_subscriptions.effective_end_date IS NULL 
AND account_subscriptions.pending=0`;
const updateSql = 'UPDATE users set hashed_password = ?, force_change = false WHERE user_sid = ?';
const retrieveStaticIps = 'SELECT * FROM account_static_ips WHERE account_sid = ?';

const validateRequest = async(user_sid, payload) => {
  const {old_password, new_password, name, email, email_activation_code} = payload;

  const [r] = await promisePool.query(retrieveSql, user_sid);
  if (r.length === 0) return null;
  const user = r[0];

  if ((old_password && !new_password) || (new_password && !old_password)) {
    throw new DbErrorBadRequest('new_password and old_password both required');
  }
  if (new_password && name) throw new DbErrorBadRequest('can not change name and password simultaneously');
  if (new_password && user.provider !== 'local') {
    throw new DbErrorBadRequest('can not change password when using oauth2');
  }

  if ((email && !email_activation_code) || (email_activation_code && !email)) {
    throw new DbErrorBadRequest('email and email_activation_code both required');
  }
  if (!name && !new_password && !email) throw new DbErrorBadRequest('no updates requested');

  return user;
};

router.get('/', async(req, res) => {
  const logger = req.app.locals.logger;
  const token = req.user.jwt;
  const decodedJwt = jwt.verify(token, process.env.JWT_SECRET);

  let usersList;
  try {
    let results;
    if (decodedJwt.scope === 'admin') {
      results = await User.retrieveAll();
    }
    else if (decodedJwt.scope === 'account') {
      results = await User.retrieveAllForAccount(decodedJwt.account_sid);
    }
    else if (decodedJwt.scope === 'service_provider') {
      results = await User.retrieveAllForServiceProvider(decodedJwt.service_provider_sid);
    }
    else {
      throw new DbErrorBadRequest(`invalid scope: ${decodedJwt.scope}`);
    }

    if (results.length === 0) throw new Error('failure retrieving users list');

    usersList = results.map((user) => {
      const {user_sid, name, email, force_change, is_active} = user;
      let scope;
      if (!user.account_sid && !user.service_provider_sid) {
        scope = 'admin';
      } else if (user.service_provider_sid) {
        scope = 'service_provider';
      } else {
        scope = 'account';
      }

      return {
        user_sid,
        name,
        email,
        scope,
        force_change,
        is_active
      };
    });
  } catch (err) {
    sysError(logger, res, err);
  }
  res.status(200).json(usersList);
});

router.get('/me', async(req, res) => {
  const logger = req.app.locals.logger;
  const {user_sid} = req.user;

  if (!user_sid) return res.sendStatus(403);

  try {
    const [r] = await promisePool.query({sql: retrieveMyDetails, nestTables: true}, user_sid);
    logger.debug(r, 'retrieved user details');
    const payload = r[0];
    const {user, account, sp} = payload;
    ['hashed_password', 'salt', 'phone_activation_code', 'email_activation_code', 'account_sid'].forEach((prop) => {
      delete user[prop];
    });
    ['email_validated', 'phone_validated', 'force_change'].forEach((prop) => user[prop] = !!user[prop]);
    ['is_active'].forEach((prop) => account[prop] = !!account[prop]);
    account.root_domain = sp.root_domain;
    delete payload.sp;

    /* get api keys */
    const [keys] = await promisePool.query('SELECT * from api_keys WHERE account_sid = ?', account.account_sid);
    payload.api_keys = keys.map((k) => {
      return {
        api_key_sid: k.api_key_sid,
        //token: k.token.replace(/.(?=.{4,}$)/g, '*'),
        token: k.token,
        last_used: k.last_used,
        created_at: k.created_at
      };
    });

    /* get products */
    const [products] = await promisePool.query({sql: retrieveProducts, nestTables: true}, account.account_sid);
    if (!products.length || !products[0].account_subscriptions) {
      throw new Error('account is missing a subscription');
    }
    const account_subscription = products[0].account_subscriptions;
    payload.subscription = {
      status: 'active',
      account_subscription_sid: account_subscription.account_subscription_sid,
      start_date: account_subscription.effective_start_date,
      products: products.map((prd) => {
        return {
          name: prd.products.name,
          units: prd.products.unit_label,
          quantity: prd.account_products.quantity
        };
      })
    };
    if (account_subscription.pending) {
      Object.assign(payload.subscription, {
        status: 'suspended',
        suspend_reason: account_subscription.pending_reason
      });
    }
    const {
      last4,
      exp_month,
      exp_year,
      card_type,
      stripe_statement_descriptor
    } = account_subscription;
    if (last4) {
      const real_last4 = decrypt(last4);
      Object.assign(payload.subscription, {
        last4: real_last4,
        exp_month,
        exp_year,
        card_type,
        statement_descriptor: stripe_statement_descriptor
      });
    }

    /* get static ips */
    const [static_ips] = await promisePool.query(retrieveStaticIps, account.account_sid);
    payload.static_ips = static_ips.map((r) => r.public_ipv4);

    logger.debug({payload}, 'returning user details');

    res.json(payload);
  } catch (err) {
    sysError(logger, res, err);
  }
});

router.put('/:user_sid', async(req, res) => {
  const logger = req.app.locals.logger;
  const {user_sid} = req.params;
  const {old_password, new_password, name, email, email_activation_code} = req.body;

  if (req.user.user_sid && req.user.user_sid !== user_sid) return res.sendStatus(403);

  try {
    const user = await validateRequest(user_sid, req.body);
    if (!user) return res.sendStatus(404);

    if (new_password) {
      const old_hashed_password = user.hashed_password;

      const isCorrect = await verifyPassword(old_hashed_password, old_password);
      if (!isCorrect) {
        //debug(`PUT /Users/:sid pwd ${old_password} does not match hash ${old_hashed_password}`);
        return res.sendStatus(403);
      }
      const passwordHash = await generateHashedPassword(new_password);
      //debug(`updating hashed_password to ${passwordHash}`);
      const r = await promisePool.execute(updateSql, [passwordHash, user_sid]);
      if (0 === r.changedRows) throw new Error('database update failed');
    }

    if (name) {
      const r = await promisePool.execute('UPDATE users SET name = ? WHERE user_sid = ?', [name, user_sid]);
      if (0 === r.changedRows) throw new Error('database update failed');
    }

    if (email) {
      const r = await promisePool.execute(
        'UPDATE users SET email = ?, email_activation_code = ?, email_validated = 0 WHERE user_sid = ?',
        [email, email_activation_code, user_sid]);
      if (0 === r.changedRows) throw new Error('database update failed');

      if (process.env.NODE_ENV !== 'test') {
        //TODO: send email with activation code
      }
    }
    res.sendStatus(204);
  } catch (err) {
    sysError(logger, res, err);
  }
});


module.exports = router;
