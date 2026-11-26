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

### Requirement: Insert sections after a block
When a block is selected in the Page view, the editor SHALL offer to add, directly after it, a Case Study, My Experience or Findings section (credited to the contributor), a paragraph, or an image from a file.

#### Scenario: Add a case study after a paragraph
- **WHEN** the contributor selects a paragraph and chooses "Add after this → Case Study"
- **THEN** a Case Study section with the contributor's name appears right after that paragraph, ready to edit in place

#### Scenario: Add an image
- **WHEN** the contributor chooses "Add after this → Image" and selects an image file
- **THEN** the optimized image appears after the block, and a non-image file shows an error and adds nothing

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
- **WHEN** the contributor adds a Findings section and then chooses Undo
- **THEN** the section is removed and the draft is as it was before the insertion
