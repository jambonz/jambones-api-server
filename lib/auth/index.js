const Strategy = require('passport-http-bearer').Strategy;
const {getMysqlConnection} = require('../db');
const {hashString} = require('../utils/password-utils');
const debug = require('debug')('jambonz:api-server');
const jwt = require('jsonwebtoken');
const sql = `
  SELECT *
  FROM api_keys
  WHERE api_keys.token = ?`;

function makeStrategy(logger, retrieveKey) {
  return new Strategy(
    async function(token, done) {
      //logger.debug(`validating with token ${token}`);
      jwt.verify(token, process.env.JWT_SECRET, async(err, decoded) => {
        if (err) {
          if (err.name === 'TokenExpiredError') {
            logger.debug('jwt expired');
            return done(null, false);
          }
          /* its not a jwt obtained through login, check api leys */
          checkApiTokens(logger, token, done);
        }
        else {
          /* validated -- make sure it is not on blacklist */
          try {
            const s = `jwt:${hashString(token)}`;
            const result = await retrieveKey(s);
            if (result) {
              debug(`result from searching for ${s}: ${result}`);
              logger.info('jwt invalidated after logout');
              return done(null, false);
            }
          } catch (err) {
            debug(err);
            logger.info({err}, 'Error checking blacklist for jwt');
          }
          const {user_sid, service_provider_sid, account_sid, email, name, scope, permissions} = decoded;
          const user = {
            service_provider_sid,
            account_sid,
            user_sid,
            jwt: token,
            email,
            name,
            permissions,
            hasScope: (s) => s === scope,
            hasAdminAuth: scope === 'admin',
            hasServiceProviderAuth: scope === 'service_provider',
            hasAccountAuth: scope === 'account'
          };
          logger.debug({user}, 'successfully validated jwt');
          return done(null, user, {scope});
        }
      });
    }
  );
}

const checkApiTokens = (logger, token, done) => {
  getMysqlConnection((err, conn) => {
    if (err) {
      logger.error(err, 'Error retrieving mysql connection');
      return done(err);
    }
    conn.query(sql, [token], (err, results, fields) => {
      conn.release();
      if (err) {
        logger.error(err, 'Error querying for api key');
        return done(err);
      }
      if (0 == results.length) return done(null, false);
      if (results.length > 1) {
        logger.info(`api key ${token} exists in multiple rows of api_keys table!!`);
        return done(null, false);
      }

      // found api key
      let scope;
      //const scope = [];
      if (results[0].account_sid === null && results[0].service_provider_sid === null) {
        //scope.push.apply(scope, ['admin', 'service_provider', 'account']);
        scope = 'admin';
      }
      else if (results[0].service_provider_sid) {
        //scope.push.apply(scope, ['service_provider', 'account']);
        scope = 'service_provider';
      }
      else {
        //scope.push('account');
        scope = 'account';
      }

      const user = {
        account_sid: results[0].account_sid,
        service_provider_sid: results[0].service_provider_sid,
        hasScope: (s) => s === scope,
        hasAdminAuth: scope === 'admin',
        hasServiceProviderAuth: scope === 'service_provider',
        hasAccountAuth: scope === 'account'
      };
      logger.debug({user}, `successfully validated with scope ${scope}`);
      return done(null, user, {scope});
    });
  });
};

module.exports = makeStrategy;
