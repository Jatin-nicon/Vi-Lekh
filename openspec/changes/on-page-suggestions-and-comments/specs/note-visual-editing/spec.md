# Spec Delta

## Purpose

Lets contributors change a note by editing what they see on the rendered page, instead of its HTML source, while keeping the rest of the document exactly as it was.

## ADDED Requirements

### Requirement: Page view in suggest mode
The suggest-mode editor SHALL show only a Page view: the contributor's draft rendered as readers see it, in the same layout as the reader. Suggest mode SHALL NOT show the HTML code view or a separate preview. The course editors' direct-publish editor is not affected.

#### Scenario: Open suggest mode
- **WHEN** a contributor opens suggest mode on a note
- **THEN** the editor shows the Page view of their draft

#### Scenario: Suggest mode has no code view
- **WHEN** a contributor is in suggest mode
- **THEN** they see the rendered page and no HTML source, and there is no control to open one

#### Scenario: Direct editor unchanged
- **WHEN** a course editor opens the direct-publish editor
- **THEN** it still shows the HTML code view and preview

### Requirement: Edit text blocks in place
In the Page view, clicking a text block (paragraph, heading, list item, table cell, caption, quotation or similar text container) SHALL make that block editable in place. The contributor SHALL be able to change its text, including bold, italic and links already in it.

#### Scenario: Change a sentence
- **WHEN** the contributor clicks a paragraph, edits a word and clicks elsewhere
- **THEN** the paragraph shows the new word and the draft autosaves

#### Scenario: Non-text parts are not editable
- **WHEN** the contributor clicks an illustration, a decorative element or a page's frame
- **THEN** nothing becomes editable and the document is unchanged

### Requirement: Edits leave the rest of the document unchanged
Writing an on-page edit back into the draft SHALL change only the edited block's content. The document's head, styles, other blocks, attributes and fill-in fields SHALL stay as they were in the draft's HTML.

#### Scenario: One paragraph edited
- **WHEN** the contributor changes one paragraph of a complete HTML lesson
- **THEN** comparing the draft with its base version shows exactly one changed section, and the lesson's styles are unchanged

#### Scenario: Pasted content is cleaned
- **WHEN** the contributor pastes formatted text from another website into a block
- **THEN** only the plain text (with line breaks) is inserted, without the other site's styles or scripts

### Requirement: Add text and images
The top bar of the Page view SHALL always offer Text box and Image. They SHALL insert the new part directly after the block the contributor last clicked, or at the end of the note when no block was clicked. A new text box SHALL open for typing.

#### Scenario: Add a text box after a paragraph
- **WHEN** the contributor clicks a paragraph, then chooses Text box in the top bar
- **THEN** a new paragraph appears right after that paragraph, ready to type in

#### Scenario: Add a text box with nothing clicked
- **WHEN** the contributor opens the Page view and chooses Text box without clicking any part
- **THEN** the new paragraph appears at the end of the note

#### Scenario: Add an image
- **WHEN** the contributor chooses Image and selects an image file
- **THEN** the optimized image appears after the last-clicked block, and a non-image file shows an error and adds nothing

### Requirement: Block type
The top bar SHALL offer Normal text, Heading 1, Heading 2 and Heading 3. While a paragraph or heading is being edited, choosing one SHALL change only that block's tag, keeping its attributes and content. With no block being edited, choosing one SHALL insert a new block of that type where Text box would.

#### Scenario: Turn a paragraph into a heading
- **WHEN** the contributor edits a paragraph and chooses Heading 2
- **THEN** the paragraph shows as a heading, and in the draft only its start and end tag names change

#### Scenario: Insert a heading
- **WHEN** no block is being edited and the contributor chooses Heading 2
- **THEN** a new Heading 2 is inserted and opens for typing

### Requirement: Remove a part
When a block is selected in the Page view, the editor SHALL offer to remove it. Removing SHALL delete only that block from the draft and leave every other character unchanged. When the block is inside a contributor section (a Case Study, My Experience or Findings section already in the note) or is an image, the editor SHALL also offer to remove the whole section or image. Removal SHALL be possible for the instructor's blocks as well as the contributor's.

#### Scenario: Remove a paragraph the contributor added
- **WHEN** the contributor selects a paragraph they added and presses ×
- **THEN** the paragraph is gone from the page and the draft, and the rest of the draft is unchanged

#### Scenario: Remove the instructor's paragraph
- **WHEN** the contributor removes one of the note's own paragraphs
- **THEN** it is removed from the draft and "Review your changes" shows it as removed

#### Scenario: Remove an added section
- **WHEN** the contributor selects text inside a contributor section and chooses Remove section
- **THEN** the whole section is removed

#### Scenario: Undo a removal
- **WHEN** the contributor removes a part and then chooses Undo
- **THEN** the draft is exactly as it was before the removal

### Requirement: Format text
A formatting bar at the top of the Page view SHALL stay visible while scrolling and act on the block being edited: bold, italic, underline, strikethrough, link, palette text colour and highlight, alignment (left, centre, right, justify) and clear formatting. Inline formats SHALL apply to the selected text and alignment to the whole block, changing nothing outside that block.

#### Scenario: Bold a word
- **WHEN** the contributor selects a word in the block being edited and presses Bold
- **THEN** the word is bold on the page and in the draft

#### Scenario: Colour a phrase
- **WHEN** the contributor selects a phrase and picks a colour from the palette
- **THEN** the phrase shows in that colour and only that phrase changes in the draft

#### Scenario: Centre a paragraph
- **WHEN** the contributor chooses Centre while editing a paragraph
- **THEN** the paragraph is centred and only its opening tag changes in the draft

#### Scenario: Clear formatting
- **WHEN** the contributor selects formatted text and chooses Clear formatting
- **THEN** the text keeps its words but loses the bold, italic, underline, strikethrough, colour and highlight

### Requirement: Top bar always available
The top bar SHALL always be visible in the Page view with its controls available. Pressing a text format with no block being edited SHALL say to click text on the page first and change nothing.

#### Scenario: Nothing being edited
- **WHEN** no block is being edited and the contributor presses Bold
- **THEN** the bar says to click text on the page first, and the draft is unchanged

### Requirement: Parts that can't be edited on the page
When the contributor clicks a block whose change can't be safely written back into the note's HTML, the system SHALL NOT edit it, SHALL say that this part can't be edited on the page, and SHALL offer to leave a comment about it instead.

#### Scenario: Unmappable block
- **WHEN** the contributor clicks a block that can't be matched to the note's HTML
- **THEN** a message explains it can't be edited on the page, with a "Leave a comment" action that opens the comment form quoting that text, and the draft is unchanged

### Requirement: Review changes before submitting
Before the summary and submit step, the system SHALL show a "Review your changes" screen with the version the draft started from (Before) and the draft (After) side by side, scrolling together, with changed, added and removed parts highlighted. On narrow screens Before and After SHALL be tabs. The screen SHALL also be available from a "Review changes" action at any time.

#### Scenario: One paragraph edited
- **WHEN** the contributor edited one paragraph and chooses Submit for review
- **THEN** the review screen shows Before and After side by side with that paragraph highlighted in both, and offers Back to editing or Continue to submit

#### Scenario: No changes
- **WHEN** the contributor opens the review screen without having changed anything
- **THEN** it says there are no changes yet and continuing to submit is not available

#### Scenario: Narrow screen
- **WHEN** the review screen opens on a phone-width screen
- **THEN** Before and After are shown as tabs

### Requirement: Undo and redo on the page
The Page view SHALL let the contributor undo and redo their on-page edits and insertions, in order.

#### Scenario: Undo an insertion
- **WHEN** the contributor adds a text box and then chooses Undo
- **THEN** the text box is removed and the draft is as it was before the insertion
