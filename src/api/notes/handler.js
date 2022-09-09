// Handler scope is to validate data, receive respond and returning response
const ClientError = require("../../exceptions/ClientError");

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
      // Parse payload
      this._validator.validateNotePayload(request.payload);
      const { title = 'untitled', body, tags } = request.payload;
  
      // Pass data to noteService
      const noteId = await this._service.addNote({ title, body, tags });
  
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

  async getNotesHandler() {
    const notes = await this._service.getNotes();
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
      const { id } = request.params;
      const note = await this._service.getNoteById(id);
      return {
        status: 'success',
        data: {
          note,
        },
      };
    } catch (error) {
      if (error instanceof ClientError) {
        const response = h.response({
          status: 'fail',
          message: error.message
        });
        response.code(error.statusCode);
        return response;
      }
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