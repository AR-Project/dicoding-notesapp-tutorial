require('dotenv').config();

const Hapi = require('@hapi/hapi');
const Jwt = require('@hapi/jwt');
const Inert = require('@hapi/inert');
const path = require('path');

// notes plugin
const notes = require('./api/notes');
const NotesService = require('./services/postgres/NotesService');
const NotesValidator = require('./validator/notes');

// user
const users = require('./api/users');
const UserService = require('./services/postgres/UsersService');
const UsersValidator = require('./validator/users');

// authentications - copy all this for 'plug' auth into other project
// just make sure there is authentications tables on DB
// pgm create table authentications
const authentications = require('./api/authentications'); // looking for index.js
const AuthenticationsService = require('./services/postgres/AuthenticationsService'); // need to be passed
const TokenManager = require('./tokenize/TokenManager'); // need to be passed in plugin register
const AuthenticationsValidator = require('./validator/authentications'); // will be passed

// collaborations
// using tables collaborations: collaboration tables
const collaborations = require('./api/collaborations');
const CollaborationsService = require('./services/postgres/CollaborationsService');
const CollaborationsValidator = require('./validator/collaborations');
const ClientError = require('./exceptions/ClientError');

// Exports
const _exports = require('./api/exports');
const ProducerService = require('./services/rabbitmq/ProducerService');
const ExportsValidator = require('./validator/exports');

// upload
const uploads = require('./api/uploads');
const StorageService = require('./services/storage/StorageService');
const UploadValidator = require('./validator/uploads');

// cache
const CacheService = require('./services/redis/CacheService');

const init = async () => {
  // Remember: Object has property/data, function is not.
  // So Object need to initialized first
  const cacheService = new CacheService();
  const collaborationsService = new CollaborationsService(cacheService);
  const notesService = new NotesService(collaborationsService, cacheService);
  const userService = new UserService();
  const authenticationService = new AuthenticationsService();
  const storageService = new StorageService(path.resolve(__dirname, 'api/uploads/file/images'));

  const server = Hapi.server({
    port: process.env.PORT,
    host: process.env.HOST,
    routes: {
      cors: {
        origin: ['*'],
      },
    },
  });

  // registrasi plugin ekstrenal
  await server.register([
    {
      plugin: Jwt,
    },
    {
      plugin: Inert,
    },
  ]);
  // this is for 'header' modification
  // server.auth.strategy will be RUN on EVERY REQUEST!!
  server.auth.strategy('notesapp_jwt', 'jwt', {
    keys: process.env.ACCESS_TOKEN_KEY,
    verify: {
      aud: false,
      iss: false,
      sub: false,
      maxAgeSec: process.env.ACCESS_TOKEN_AGE,
    },
    validate: (artifacts) => ({
      isValid: true,
      credentials: {
        id: artifacts.decoded.payload.id,
      },
    }),
  });

  await server.register([
    {
      plugin: notes,
      options: {
        service: notesService,
        validator: NotesValidator,
      },
    },
    {
      plugin: users,
      options: {
        service: userService,
        validator: UsersValidator,
      },
    },
    {
      plugin: authentications,
      options: {
        authenticationService,
        userService,
        tokenManager: TokenManager,
        validator: AuthenticationsValidator,
      },
    },
    {
      plugin: collaborations,
      options: {
        collaborationsService,
        notesService,
        validator: CollaborationsValidator,
      },
    },
    {
      plugin: _exports,
      options: {
        service: ProducerService,
        validator: ExportsValidator,
      },
    },
    {
      plugin: uploads,
      options: {
        service: storageService,
        validator: UploadValidator,
      },
    },
  ]);

  server.ext('onPreResponse', (request, h) => {
    // destructure request object, taking response
    const { response } = request;

    // catch ALL ERROR in response
    if (response instanceof Error) {
      // catch ClientError
      if (response instanceof ClientError) {
        const newResponse = h.response({
          status: 'fail',
          message: response.message,
        });
        newResponse.code(response.statusCode);
        return newResponse;
      }
      // skip error, keep respond continue if it threw by server side.
      if (!response.isServer) {
        return h.continue;
      }
      // catch error if something wrong with app
      const newResponse = h.response({
        status: 'error',
        message: 'terjadi kegagalan pada server kami',
      });
      newResponse.code(500);
      return newResponse;
    }

    // if response not an error
    return h.continue;
  });

  await server.start();
  console.log(`Server berjalan pada ${server.info.uri}`);
};

init();

// console.log('run')
