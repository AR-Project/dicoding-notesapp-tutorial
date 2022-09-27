const { nanoid } = require('nanoid');
const { Pool } = require('pg');
const InvariantError = require('../../exceptions/InvariantError');
const NotFoundError = require('../../exceptions/NotFoundError');
const AuthorizationError = require('../../exceptions/AuthorizationError');
const { mapDBtoModel } = require('../utils');

class NotesService {
  constructor(collaborationService, cacheService) { // refer to server.js plugin opt
    this._pool = new Pool();
    this._collaborationService = collaborationService;
    this._cacheService = cacheService;
  }

  async addNote({
    title, body, tags, owner,
  }) {
    // initialize metadata for a new note
    const id = nanoid(16);
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    // query for note insert
    const query = {
      text: 'INSERT INTO notes VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING id',
      values: [id, title, body, tags, createdAt, updatedAt, owner],
    };

    // run query anf get result
    const result = await this._pool.query(query);

    // check if successfully inserted
    if (!result.rows[0].id) {
      throw new InvariantError('Catatan gagal ditambahkan');
    }

    await this._cacheService.delete(`notes:${owner}`);

    // return id
    return result.rows[0].id;
  }

  async getNotes(owner) {
    try {
      const result = await this._cacheService.get(`notes:${owner}`);
      return JSON.parse(result);
    } catch (error) {
      // prep query
      const query = {
        text: `SELECT notes.* FROM notes
        LEFT JOIN collaborations ON collaborations.note_id = notes.id
        WHERE notes.owner = $1 OR collaborations.user_id = $1
        GROUP BY notes.id`,
        values: [owner],
      };

      // fetch data from db
      const result = await this._pool.query(query);

      // return data from result
      // return result.rows.map(mapDBtoModel);
      const mappedResult = result.rows.map(mapDBtoModel);

      // catatan akan disimpan pada cache sebelum fungsi getNotes dikembalikan
      await this._cacheService.set(`notes:${owner}`, JSON.stringify(mappedResult));

      return mappedResult;
    }
  }

  async getNoteById(id) {
    // init query data using id
    const query = {
      // text: 'SELECT * FROM notes WHERE id = $1',
      text: `SELECT notes.*, users.username
      FROM notes
      LEFT JOIN users ON users.id = notes.owner
      WHERE notes.id = $1`,
      values: [id],
    };

    // run query, fetch data intu result
    const result = await this._pool.query(query);

    // result validation
    if (!result.rows.length) {
      throw new NotFoundError('Catatan tidak ditemukan');
    }

    // return result
    return result.rows.map(mapDBtoModel)[0];
  }

  async editNoteById(id, { title, body, tags }) {
    // init new date
    const updatedAt = new Date().toISOString();

    // prepare query
    const query = {
      text: 'UPDATE notes SET title = $1, body = $2, tags = $3, update_at = $4 WHERE id = $5 RETURNING id',
      values: [title, body, tags, updatedAt, id],
    };

    // run query
    const result = await this._pool.query(query);

    // validate result
    if (!result.rows.length) {
      throw new NotFoundError('Gagal memperbarui catatan. Id tidak ditemukan');
    }

    const { owner } = result.rows[0];
    await this._cacheService.delete(`notes:${owner}`);
  }

  async deleteNoteById(id) {
    // prepare query
    const query = {
      text: 'DELETE FROM notes WHERE id = $1 RETURNING id',
      values: [id],
    };

    // run query
    const result = await this._pool.query(query);

    // validate result
    if (!result.rows.length) {
      throw new NotFoundError('Catatan gagal dihapus. Id tidak ditemukan');
    }

    const { owner } = result.rows[0];
    await this._cacheService.delete(`notes:${owner}`);
  }

  async verifyNoteOwner(id, owner) {
    // prep query
    const query = {
      text: 'SELECT * FROM notes WHERE id = $1',
      values: [id],
    };

    // run query
    const result = await this._pool.query(query);

    // check result
    if (!result.rows.length) {
      throw new NotFoundError('Catatan tidak ditemukan');
    }

    // take the first note
    const note = result.rows[0];

    if (note.owner !== owner) {
      throw new AuthorizationError('Anda tidak berhak mengakses resource ini');
    }
  }

  async verifyNoteAccess(noteId, userId) {
    // what this function receieve, specific noteID and User ID
    // Summary: check if those two value has some correlation
    try {
      // check is current user has ownership of notes
      await this.verifyNoteOwner(noteId, userId);
      // possible error: notfound or authorization error
      // if this not throw error means notesId is exist AND current userId IS
      // the real OWNER of current notesID
    } catch (error) {
      // if code reaching here means: there error of those possible error,
      // ONLY if the error are not found, the app right away throw the error
      if (error instanceof NotFoundError) {
        throw error;
      }

      // if not NotFoundError, means current noteID is exist BUT userID who trying
      // to access it was NOT OWNER.
      try {
        // so it called verify collaborator in collaborationService
        await this._collaborationService.verifyCollaborator(noteId, userId);
      } catch {
        throw error;
      }
    }
  }
}

module.exports = NotesService;
