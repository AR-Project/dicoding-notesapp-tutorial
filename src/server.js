require('dotenv').config();

const Hapi = require('@hapi/hapi');
const Jwt = require('@hapi/jwt');

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

const init = async () => {
  // Remember: Object has property/data, function is not.
  // So Object need to initialized first
  const collaborationsService = new CollaborationsService();
  const notesService = new NotesService(collaborationsService);
  const userService = new UserService();
  const authenticationService = new AuthenticationsService();

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

  await server.ext('onRequest', (request, h) => {
    const message = `${request.method} | ${request.path}`;
    console.log(message);
    // console.log(h);
    return h.continue;
  });

  // await server.ext('onPreResponse', (request, h ) => {
  //   const message = `${h.response}`;
  //   console.log(message + '\n')
  //   return h.continue;
  // })

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
    // this is for the 'route'
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
  ]);

  await server.start();
  console.log(`Server berjalan pada ${server.info.uri}`);
};

init();

// console.log('run')
