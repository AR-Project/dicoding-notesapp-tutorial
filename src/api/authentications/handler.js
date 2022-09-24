class AuthenticationHandler {
  constructor(authenticationsService, usersService, tokenManager, validator) {
    // change 'scope' of passed function/class from server to be used in this file scope
    this._authenticationsService = authenticationsService;
    this._usersService = usersService;
    this._tokenManager = tokenManager;
    this._validator = validator;

    // binding
    this.postAuthenticationHandler = this.postAuthenticationHandler.bind(this);
    this.putAuthenticationHandler = this.putAuthenticationHandler.bind(this);
    this.deleteAuthenticationHandler = this.deleteAuthenticationHandler.bind(this);
  }

  async postAuthenticationHandler(request, h) {
    // validate data only using JOI in Authentication Validation
    // if validation fail means data sent from user is invalid
    this._validator.validatePostAuthenticationPayload(request.payload);

    // destructure payload after username and password is valid
    const { username, password } = request.payload;

    // verify username and password compared in database using user services
    // if username and password not valid, error will threw from userservice, and
    // being catched here
    const id = await this._usersService.verifyUserCredential(username, password);

    // generate new token from Token Manager
    const accessToken = this._tokenManager.generateAccessToken({ id });
    const refreshToken = this._tokenManager.generateRefreshToken({ id });

    // store refresh token into database using authentication service
    await this._authenticationsService.addRefreshToken(refreshToken);

    // put accessToken and refresh token in body response
    const response = h.response({
      status: 'success',
      message: 'Authentication berhasil ditambahkan',
      data: {
        accessToken,
        refreshToken,
      },
    });

    response.code(201);
    return response;
  }

  async putAuthenticationHandler(request) {
    // this function only run via route PUT /authentications,
    // refresh token is long lasting than access token
    // so this function is used for generate NEW ACCESS TOKEN

    // validate if refresh token is exist from user using auth validator > Joi schema
    this._validator.validatePutAuthenticationPayload(request.payload);

    // get current refresh token
    const { refreshToken } = request.payload;

    // validate refreshed tokens auth service > verify > auth database
    await this._authenticationsService.verifyRefreshToken(refreshToken);

    // verify signature(?) of refreshed token, refreshed token must be
    // contain id?
    const { id } = this._tokenManager.verifyRefreshToken(refreshToken);

    // generate new accessToken which is short lived compared to refreshToken
    const accessToken = this._tokenManager.generateAccessToken({ id });

    // put new generated accessToken into response data;
    return {
      status: 'success',
      message: 'Access Token berhasil diperbarui',
      data: {
        accessToken,
      },
    };
  }

  async deleteAuthenticationHandler(request) {
    // used for delete refreshToken in database
    // validate payload if it contains refresh tokens
    this._validator.validateDeleteAuthenticationPayload(request.payload);

    // get refresh token from request.payload
    const { refreshToken } = request.payload;

    // validate refreshToken against database via auth service
    // if it not there auth service will call error
    await this._authenticationsService.verifyRefreshToken(refreshToken);

    // finally delete refreshToken in database via auth service
    await this._authenticationsService.deleteRefreshToken(refreshToken);

    // return matching requirement
    return {
      status: 'success',
      message: 'Refresh token berhasil dihapus',
    };
  }
}

module.exports = AuthenticationHandler;
