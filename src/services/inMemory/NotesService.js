const { nanoid } = require("nanoid");

class NotesService {
  constructor () {
    this._notes = [];
  }
  // Add new note Method
  addNote({ title, body, tags }) {
    // Initialize metadata for a new Note
    const id = nanoid(16);
    const createdAt = new Date().toISOString();
    const updatedAt = createdAt;

    // Compile all data into single variable
    const newNote = {
      title, tags, body, id, createdAt, updatedAt,
    };

    // Insert newNote into DB
    this._notes.push(newNote);

    // Check if successfully inserted
    const isSuccess = this._notes.filter((note) => note.id === id).length > 0;

    if (!isSuccess) {
      throw new Error('Catatan gagal ditambahkan')
    }

    return id;
  }

  // Get all note method
  getNotes() {
    return this._notes;  
  }

  // Get a note using id
  getNoteById(id) {
    // 'Fetch' a note from 'note database'
    const note = this._notes.filter((n) => n.id === id)[0];

    // If the note doesn't exist aka filter function return nothing
    if (!note) {
      throw new Error('Catatan tidak ditemukan');
    }

    // Succesfully get a note by id
    return note;
  }

  // Update a note that being fetch using id
  editNoteById(id, { title, body, tags }) {
    // Find 'pointer' to particular note using id
    const index = this._notes.findIndex((note) => note.id === id);

    // If not succedd throw error
    if (index === -1) {
      throw new Error('Gagal memperbarui catatan. Id tidak ditemukan')
    }

    // Initialized new date metadata
    const updatedAt = new Date().toISOString();

    // 'directly' manipulate data in notes 'database' using index
    this._notes[index] = {
      ...this._notes[index], // Spread existing notes
      title, // Overwrite
      tags,
      body,
      updatedAt
    }
  }

  // Delete a note using id
  deleteNoteById(id) {
    // Find 'pointer' to particular note using id
    const index = this._notes.findIndex((note) => note.id === id);

    // Check if the note is exist. If not throw an error
    if (index === -1){
      throw new Error('Catatan gagal dihapus. Id tidak ditemukan')
    }

    // 'DELETE the note using splice array method
    this._notes.splice(index, 1);
  }
}

module.exports = NotesService;