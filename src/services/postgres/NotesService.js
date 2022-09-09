const { nanoid } = require("nanoid");
const { Pool } = require("pg");
const InvariantError = require("../../exceptions/InvariantError");
const NotFoundError = require('../../exceptions/NotFoundError');
const { mapDBtoModel } = require("../utils");

class NotesService {
  constructor() {
    this._pool = new Pool();
  }

  async addNote({ title, body, tags }) {
    // initialize metadata for a new note
    const id = nanoid(16);
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    // query for note insert
    const query = {
      text: 'INSERT INTO notes VALUES($1, $2, $3, $4, $5, $6) RETURNING id',
      values: [id, title, body, tags, createdAt, updatedAt],
    };

    // run query anf get result
    const result = await this._pool.query(query);

    // check if successfully inserted
    if (!result.rows[0].id){
      throw new InvariantError('Catatan gagal ditambahkan')
    }

    // return id
    return result.rows[0].id;
  }

  async getNotes() {
    // fetch data from db
    const result = await this._pool.query('SELECT * FROM notes');

    // return data from result
    return result.rows.map(mapDBtoModel);
  }

  async getNoteById(id) {
    // init query data using id
    const query = {
      text: 'SELECT * FROM notes WHERE id = $1',
      values: [id],
    };

    // run query, fetch data intu result
    const result = await this._pool.query(query);

    // result validation
    if (!result.rows.length) {
      throw new NotFoundError('Catatan tidak ditemukan')
    }

    // return result
    return result.rows.map(mapDBtoModel)[0];
  }

  async editNoteById( id, { title, body, tags }) {
    // init new date
    const updatedAt = new Date().toISOString();
    
    // prepare query
    const query = {
      text: 'UPDATE notes SET title = $1, body = $2, tags = $3, update_at = $4 WHERE id = $5 RETURNING id',
      values: [ title, body, tags, updatedAt, id]
    }

    // run query
    const result = await this._pool.query(query);

    // validate result
    if (!result.rows.length) {
      throw new NotFoundError('Gagal memperbarui catatan. Id tidak ditemukan');
    }
  }

  async deleteNoteById (id) {
    // prepare query 
    const query = {
      text: 'DELETE FROM notes WHERE id = $1 RETURNING id',
      values: [id],
    }

    // run query
    const result = await this._pool.query(query);

    // validate result
    if (!result.rows.length) {
      throw new NotFoundError('Catatan gagal dihapus. Id tidak ditemukan')
    }
  }
}

module.exports = NotesService;