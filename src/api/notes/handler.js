// Handler scope is to validate data, receive respond and returning response
// const ClientError = require('../../exceptions/ClientError');
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

  async postNoteHandler(request, h) {
    // Parse incoming payload (payload = body)
    this._validator.validateNotePayload(request.payload);
    const { title = 'untitled', body, tags } = request.payload;
    const { id: credentialId } = request.auth.credentials;

    // Pass data to noteService
    const noteId = await this._service.addNote({
      title, body, tags, owner: credentialId,
    });

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
    };
  }

  async getNoteByIdHandler(request) {
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
  }

  async putNoteByIdHandler(request) {
    this._validator.validateNotePayload(request.payload);
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;

    await this._service.verifyNoteAccess(id, credentialId);
    await this._service.editNoteById(id, request.payload);
    return {
      status: 'success',
      message: 'Catatan berhasil diperbarui',
    };
  }

  async deleteNoteByIdHandler(request) {
    const { id } = request.params;
    const { id: credentialId } = request.auth.credentials;

    await this._service.verifyNoteOwner(id, credentialId);
    await this._service.deleteNoteById(id);
    return {
      status: 'success',
      message: 'Catatan berhasil dihapus',
    };
  }
}

module.exports = NotesHandler;
