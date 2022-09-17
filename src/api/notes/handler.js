// Handler scope is to validate data, receive respond and returning response
const ClientError = require("../../exceptions/ClientError");
// the reason why notes service is not imported here because, NoteService is Object 
// being init and used via server.js FIRST,


class NotesHandler {
  constructor(service, validator) {
    this._service = service;
    this._validator = validator;

    this.postNoteHandler = this.postNoteHandler.bind(this);
    this.getNotesHandler = this.getNotesHandler.bind(this);
    this.getNoteByIdHandler = this.getNoteByIdHandler.bind(this);
    this.putNoteByIdHandler = this.putNoteByIdHandler.bind(this);
    this.deleteNoteByIdHandler = this.deleteNoteByIdHandler.bind(this);
  }

  async postNoteHandler (request, h) {
    try {
      // Parse incoming payload (payload = body)
      this._validator.validateNotePayload(request.payload);
      const { title = 'untitled', body, tags } = request.payload;
      const { id: credentialId } = request.auth.credentials;
  
      // Pass data to noteService
      const noteId = await this._service.addNote({ title, body, tags, owner: credentialId });
  
      // Initialized response
      const response = h.response({
        status: 'success',
        message: 'Catatan berhasil ditambahkan',
        data: {
          noteId,
        },
      });
  
      // Add more response
      response.code(201);
      return response;
    } catch (error) {
      // User Error
      if (error instanceof ClientError){
        const response = h.response({
          status: 'fail',
          message: error.message,
        });
        response.code(error.statusCode);
        return response;
      }

      // Server error
      const response = h.response({
        status: 'error',
        message: 'Maaf, terjadi kegagalan pada server kami.',
      });
      response.code(500);
      console.error(error);
      return response;

    }
  }

  async getNotesHandler(request) {
    // get id from auth
    const { id: credentialId } = request.auth.credentials;

    const notes = await this._service.getNotes(credentialId);
    // no need to modified respone header because respond code is using
    // default data (TIL 200 is default when you return a response)
    // other method need response to be 'destructured' before send to user because 
    // response code need to be altered.
    return {
      status: 'success',
      data: {
        notes,
      },
    }

  }

  async getNoteByIdHandler(request, h){
    try {
      // parse incoming parameter (param = url)
      const { id } = request.params;
      const { id: credentialId } = request.auth.credentials;

      // validate if current user is owner of current note
      await this._service.verifyNoteAccess(id, credentialId);
      const note = await this._service.getNoteById(id);

      // Return success
      return {
        status: 'success',
        data: {
          note,
        },
      };
    } catch (error) { // Return fail
      // Fail bad request
      if (error instanceof ClientError) {
        const response = h.response({
          status: 'fail',
          message: error.message
        });
        response.code(error.statusCode);
        return response;
      }

      // fail server errror
      const response = h.response({
        status: 'eror',
        message: 'Maaf, terjadi kegagalan pada server kami.'
      });
      response.code(500);
      console.error(error);
      return response;
    }

  }

  async putNoteByIdHandler(request, h) {
    try {
      this._validator.validateNotePayload(request.payload);
      const { id } = request.params;
      const { id: credentialId } = request.auth.credentials;
    
      await this._service.verifyNoteAccess(id, credentialId)
      await this._service.editNoteById(id, request.payload);
      return {
        status: 'success',
        message: 'Catatan berhasil diperbarui',
      }
    } catch (error) {
      if (error instanceof ClientError) {
        const response = h.response({
          status: 'fail',
          message: error.message,
        });
        response.code(error.statusCode);
        return response;
      }
      const response = h.response({
        status: 'error',
        message: 'Maaf, terjadi kegagalan pada server kami.',
      });
      response.code(500);
      console.error(error);
      return response;
    }
  }

  async deleteNoteByIdHandler(request, h) {
    try {
      const { id } = request.params;
      const { id: credentialId } = request.auth.credentials;

      await this._service.verifyNoteOwner(id, credentialId);
      await this._service.deleteNoteById(id);
      return {
        status: 'success',
        message: 'Catatan berhasil dihapus',
      };
    } catch (error){
      if (error instanceof ClientError) {
        const response = h.response({
          status: 'fail',
          message: error.message,
        });
        response.code(error.statusCode);
        return response;
      }
      const response = h.response({
        status: 'error',
        message: 'Maaf, terjadi kegagalan pada server kami.',
      });
      response.code(500);
      console.error(error);
      return response;
    }
  }
}

module.exports = NotesHandler;