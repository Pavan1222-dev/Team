
const express = require("express");
const router = express.Router();
const validate = require("../middleware/validate");
const { bookSchema } = require("../validations/bookValidation");

const bookController = require("../controllers/bookController");

router.get("/", bookController.getAllBooks);
router.get("/:id", bookController.getBookById);
router.post("/", validate(bookSchema), bookController.createBook);
router.put("/:id", validate(bookSchema), bookController.updateBook);
router.delete("/:id", bookController.deleteBook);

module.exports = router;
