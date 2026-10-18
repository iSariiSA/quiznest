# Quiz import formats

[Back to the README](../README.md) · [Study guide](USER_GUIDE.md)

Create a quiz file yourself or use one of the [complete examples](../examples/). In Quiznet, choose **New quiz → Import file** inside a unit, or **… → Import…**. Preview the file and choose its destination before importing.

Import JSON/CSV quiz files here; restore whole-library backups through **… → Settings → Restore**. Restoring replaces the current library and preserves a separate pre-restore copy.

## Import questions

### JSON

```json
{
  "course": "Biology",
  "unit": "Unit 1: Cells",
  "title": "Quiz 1",
  "questions": [
    {
      "prompt": "Which organelle contains most of a cell's DNA?",
      "options": ["Nucleus", "Ribosome", "Golgi apparatus", "Lysosome"],
      "correctAnswer": 0,
      "explanation": "Most DNA in a eukaryotic cell is stored in the nucleus."
    }
  ]
}
```

`correctAnswer` is a **zero-based number**: 0 is the first answer, 1 the second, and so on. An option letter (`A`, …, `Z`, `AA`, …) or exact option text is also accepted. Explanations are optional. Omitted `type` means `single-choice`, preserving existing quizzes.

Set `"type": "multiple-answer"` and use `"correctAnswers": [0, 2]` for a question with several correct choices. The array must contain at least one distinct valid option; letters or exact option texts also work. During practice, click again to deselect a choice. Scoring requires the complete correct set without extra choices; there is no partial credit. At least one selection is required to finish.

Set `"type": "true-false"` with two `options` and one `correctAnswer` for true/false questions. The two labels are editable content, so you can use other languages. All types support images and HTML. Mix types in any quiz; see [mixed-questions.json](../examples/mixed-questions.json).

Aliases: `question` for `prompt`, `choices` for `options`, and `answer` or `correctIndex` for `correctAnswer` (`answer` may be an array for multiple-answer questions). Arrays of `{ "text": "…", "isCorrect": true/false }` options are accepted with one marked correct for single answers, or one or more for multiple answers. A bare questions array is accepted. To import several quizzes, use `{ "quizzes": [<quiz>, <quiz>] }`.

Missing course/unit names default to `Imported course` and `Unit 1`. The preview lets you override the destination. Matching course/unit names reuse the existing items; duplicate quiz titles receive a numeric suffix so existing quizzes are preserved.

### Images and HTML

In the quiz editor, choose **Add image** for a local PNG, JPEG, GIF, or WebP file (up to 2 MB). An optional image description helps accessibility. **Replace image** and the image's remove button update that attachment. Open **Preview** to check the question before saving.

Choose **HTML** in the **Format** selector to format the prompt, options, and explanation. Supported formatting includes paragraphs, bold/italic text, lists, tables, code, and superscripts/subscripts. Images may also appear inside HTML using embedded raster data URLs. Scripts, styles, forms, embedded pages, event handlers, and external links or image sources are removed from the displayed content. Existing questions retain their format.

For JSON imports, set `"format": "html"`. Attach an image with `"image": "data:image/png;base64,..."` and optional `"imageAlt": "Description"`. The image field must contain the complete base64 data URL, not a filename or an online URL. The editor creates that value for you; export a quiz to reuse it. See the complete [images and HTML example](../examples/images-html.json).

```json
{
  "format": "html",
  "prompt": "<p>Which formula represents <strong>water</strong>?</p>",
  "options": ["H<sub>2</sub>O", "CO<sub>2</sub>"],
  "correctAnswer": 0,
  "explanation": "Two hydrogen atoms and one oxygen atom."
}
```

Images are embedded in the local library, exports, backups, and historical attempts. The original image file is no longer needed after saving. Keep images small for faster saves and smaller backups. Version 1.3 reads existing version-1 libraries without a migration; earlier apps do not preserve these new optional fields, so use 1.3 or newer for image/HTML libraries.

### CSV

```csv
course,unit,title,question,option_a,option_b,answer,explanation
Biology,Unit 1: Cells,Quiz 1,Where is most DNA stored?,Nucleus,Ribosome,A,Inside the nucleus.
```

Use consecutive `option_a`, `option_b`, …, `option_z`, `option_aa`, … columns for 2–100 choices. Trailing empty option cells are ignored so rows can have different choice counts. CSV answers are letters or exact option text. Course, unit, title, and explanation are optional columns. Quotes support commas, escaped double quotes, and multiline text. Rows are grouped by course/unit/title.

The optional `type` column accepts `single-choice`, `multiple-answer`, and `true-false`. For multiple answers, the `answer` cell is a JSON array, quoted as CSV requires, such as `"[0,2]"` or `"[""A"",""C""]"`. True/false rows need two nonempty option cells and one answer. Missing type uses single answer.

Optional `format`, `image`, and `image_alt` columns support the same HTML mode and embedded images. Quote data URLs because they contain a comma, and escape double quotes in HTML as CSV requires.

Quiz import files are limited to 20 MB, 1,000 quizzes, and 10,000 questions per import. The editor limits each quiz to 19 MB to keep exports importable. Validation is all-or-nothing. Examples are in [examples/](../examples/). Full library backups are restored from Settings rather than imported as questions; the quiz-import file limit does not apply to backups.

### Code and Markdown

In the editor, choose **Add code**, select a **Code language**, and paste the snippet. Code is displayed with syntax colors, preserved indentation, and horizontal scrolling; it is never executed. Code attachments work with plain-text, HTML, and Markdown questions and can accompany images.

Choose **Markdown** in the **Format** selector for headings, emphasis, lists, tables, inline code, and fenced code blocks in prompts, answer options, and explanations. Start a fenced block with three backticks followed by its language (for example, `python`), put the code on the following lines, and close it with three backticks. The same selector offers Text and HTML; existing questions retain their format.

The language catalog includes Python, JavaScript, TypeScript, Java, C, C++, C#, SQL, JSON, HTML/XML, CSS, Bash, Markdown, and plain text. Unknown language names render as plain text. All libraries and language definitions are bundled with the app for offline use. Raw HTML in Markdown is shown literally; external links and images remain inactive.

For JSON imports, add `"code": "print(1 + 2)"` and `"codeLanguage": "python"`, or set `"format": "markdown"` and include fenced blocks. CSV has optional `code` and `code_language` columns; quote multiline snippets. See [code-markdown.json](../examples/code-markdown.json) for a complete mixed example. Code and Markdown survive exports, backups, saved attempts, and results.

Code attachments are limited to 50,000 characters and Markdown fields to 100,000. Blocks above 12,000 characters display as plain code to keep the interface responsive. Version 1.5 reads earlier libraries without rewriting them on startup; older apps do not preserve code fields or understand Markdown, so keep a backup before rollback.


