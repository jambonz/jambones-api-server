# jambonz-api-server ![Build Status](https://github.com/jambonz/jambonz-api-server/workflows/CI/badge.svg)

Jambones REST API server.

## Configuration

This process requires the following environment variables to be set.

```
JAMBONES_MYSQL_HOST
JAMBONES_MYSQL_USER
JAMBONES_MYSQL_PASSWORD
JAMBONES_MYSQL_DATABASE
JAMBONES_MYSQL_CONNECTION_LIMIT   # defaults to 10
JAMBONES_REDIS_HOST
JAMBONES_REDIS_PORT
JAMBONES_LOGLEVEL                 # defaults to info
JAMBONES_API_VERSION              # defaults to v1               
JAMBONES_TIME_SERIES_HOST
JWT_SECRET
HTTP_PORT                         # defaults to 3000
```

#### Database dependency
A mysql database is used to store long-lived objects such as Accounts, Applications, etc. To create the database schema, use or review the scripts in the 'db' folder, particularly:
- [jambones-sql.sql](db/jambones-sql.sql), which creates the schema,
- [seed-production-database-open-source.sql](db/seed-production-database-open-source.sql), which seeds the database with initial dataset(accounts, permissions, api keys, applications etc).
- [create-admin-user.sql](db/create-admin-user.sql), which creates admin user with password set to "admin". The password will be forced to change after the first login.

> Note: due to the dependency on the npmjs [mysql](https://www.npmjs.com/package/mysql) package, the mysql database must be configured to use sql [native authentication](https://medium.com/@crmcmullen/how-to-run-mysql-8-0-with-native-password-authentication-502de5bac661).

#### Running the app
At this point, if you have followed the above instructions, its simply
```
npm install
node app
```
The server will listen by default on port 3000, to change this set the HTTP_PORT environment variable:
```
HTTP_PORT=4000 node app
```

#### Running the test suite
To run the included test suite, you will need to have a mysql server installed on your laptop/server. You will need to set the MYSQL_ROOT_PASSWORD env variable to the mysql root password before running the tests.  The test suite creates a database named 'jambones_test' in your mysql server to run the tests against, and removes it when done.
```
MYSQL_ROOT_PASSWORD=foobar npm test
```

#### Testing a deployed server
There is a swagger endpoint at `http://<your-ip>:3000/swagger` that can be used to exercise the APIs. Bearer authentication is required, so you will need an auth token (refer to [create-admin-token.sql](db/create-admin-token.sql) to see how to generate one).s