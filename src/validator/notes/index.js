const InvariantError = require("../../exceptions/InvariantError");
const { NotePayloadSchema } = require("./schema");

// This file only dealing with JOI schema : schema.js
// Solely purpose is validating payload
const NotesValidator = {
  validateNotePayload: (payload) => {
    const validationResult = NotePayloadSchema.validate(payload);
    if (validationResult.error) {
      throw new InvariantError(validationResult.error.message);
    }
  }
}
module.exports = NotesValidator;