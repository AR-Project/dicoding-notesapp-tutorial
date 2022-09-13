const { nanoid } = require("nanoid");
const { Pool } = require("pg");
const bcrypt = require('bcrypt');
const InvariantError = require("../../exceptions/InvariantError");
const NotFoundError = require('../../exceptions/NotFoundError');


class UserService {
  constructor() {
    this._pool = new Pool();
  }

  async addUser ({ username, password, fullname}) {
    // TODO: Verifikasi username, pastikan belum terdaftar.
    await this.verifyNewUsername(username);
    // TODO: Bila verifikasi lolos, maka masukkan user baru ke database.
    // init data
    const id = `user-${nanoid(16)}`

    // hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // prep query using all data includes hashed password
    const query = { 
      text: 'INSERT INTO users VALUES($1, $2, $3, $4) RETURNING id',
      values: [id, username, hashedPassword, fullname],
    }
    // fetch result
    const result = await this._pool.query(query)

    // insert validation
    if (!result.rows.length) {
      throw new InvariantError('User gagal ditambahkan');
    }

    // return id per requirement
    return result.rows[0].id;
  };

  async verifyNewUsername(username) {
    // prep query
    const query = {
      text: 'SELECT username FROM users WHERE username = $1',
      values: [username],
    };

    // fetch data using query
    const result = await this._pool.query(query);

    if (result.rows.length > 0) {
      throw new InvariantError('Gagal menambahkan user. Username sudah digunakan.')
    }
  }

  async getUserById(userId) {
    const query = { 
      text: 'SELECT id, username, fullname FROM users WHERE id = $1',
      values: [userId]
    }
    const result = await this._pool.query(query);

    if (!result.rows.length) {
      throw new NotFoundError('User tidak ditemukan');
    }

    return result.rows[0];
  }
}

module.exports = UserService;