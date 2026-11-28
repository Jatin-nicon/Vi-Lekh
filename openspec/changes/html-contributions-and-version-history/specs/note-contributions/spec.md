# Spec Delta

## Purpose

Lets any signed-in reader propose additions and edits to a note's HTML version (text, images, case studies, findings, optional annotations), and lets course reviewers merge, fork, send back, or reject those proposals.

## ADDED Requirements

### Requirement: Suggest-edit entry point
The note reader SHALL show a "Suggest edits" action on every note with HTML content to any signed-in user who cannot edit the course directly. It SHALL open an editable working copy of the note's current published HTML. Users who can edit directly SHALL also be offered "Suggest edits", next to their direct edit action.

#### Scenario: Reader opens a suggestion
- **WHEN** a signed-in user without editor rights clicks "Suggest edits" on a note
- **THEN** the system opens the editor in suggest mode, prefilled with the note's current published HTML, labelled as a suggestion, with no direct-publish control

#### Scenario: Signed-out visitor
- **WHEN** a signed-out visitor views a note
- **THEN** the "Suggest edits" action prompts the visitor to sign in instead of opening the editor

### Requirement: Suggestion drafts are saved and resumable
The system SHALL save a suggestion as a private draft that is tied to the user, the note and the base version it started from. The user SHALL be able to leave and resume it later. A user SHALL have at most one open draft per note.

#### Scenario: Resume a draft
- **WHEN** a user who has an open draft for a note clicks "Suggest edits" again
- **THEN** the system opens the existing draft with the user's earlier changes instead of a fresh copy

#### Scenario: Draft privacy
- **WHEN** any user other than the draft author and the Super Admin queries suggestion drafts
- **THEN** the system does not return that draft

#### Scenario: Discard a draft
- **WHEN** the author chooses "Discard draft" and confirms
- **THEN** the system deletes the draft and leaves the published note unchanged

### Requirement: Contribution content tools
The suggest-mode editor SHALL let the contributor add and change any part of the HTML. It SHALL provide one-click insertion of a paragraph, an image (from a file upload), and the ready-made sections Case Study, My Experience and Findings. Each section SHALL have a heading and editable placeholder fields.

#### Scenario: Insert a case study section
- **WHEN** the contributor clicks "Case Study" in the editor toolbar
- **THEN** the system inserts a Case Study section at the cursor with Context, What happened and Findings fields, and the live preview shows it

#### Scenario: Insert an image
- **WHEN** the contributor chooses "Image" and selects an image file
- **THEN** the system optimizes the image, embeds it at the cursor, and shows it in the live preview

#### Scenario: Reject a non-image upload
- **WHEN** the contributor selects a file that is not an image
- **THEN** the system shows an error and inserts nothing

### Requirement: Contributor attribution of added sections
The system SHALL record the contributor on each Case Study, My Experience and Findings section they insert. The reader SHALL show "Contributed by <display name>" on those sections after they are published.

#### Scenario: Published case study shows its author
- **WHEN** a merged suggestion contained a Case Study section by user A
- **THEN** readers of the note see that section with "Contributed by A"

### Requirement: Optional annotation attachment
When submitting, the contributor SHALL be able to choose to include their personal annotations on that note. Included annotations SHALL be copied into the submission as a frozen snapshot. Annotations that are not included SHALL stay private.

#### Scenario: Submit with annotations
- **WHEN** the contributor ticks "Include my annotations" and submits
- **THEN** the submission carries a snapshot of the contributor's current annotations, and the reviewer sees them drawn over the proposed version

#### Scenario: Submit without annotations
- **WHEN** the contributor leaves "Include my annotations" unticked and submits
- **THEN** no annotation data is attached and the contributor's annotations remain visible only to them

### Requirement: Suggestion submission
A contributor SHALL submit a draft with a required summary of up to 200 characters. On submission the system SHALL mark it pending review and make it read-only to the contributor. The system SHALL NOT change the published note. A submission identical to its base version SHALL be refused.

#### Scenario: Submit a suggestion
- **WHEN** the contributor enters a summary and clicks "Submit for review"
- **THEN** the suggestion becomes pending, appears in the review queue of that course's reviewers, and the published note is unchanged

#### Scenario: Submit with no changes
- **WHEN** the contributor submits a draft whose HTML and attached annotations are identical to the base version
- **THEN** the system refuses the submission with a "No changes to submit" message

#### Scenario: Withdraw a pending suggestion
- **WHEN** the contributor chooses "Withdraw" on their pending suggestion
- **THEN** the suggestion returns to draft status and leaves the review queue

### Requirement: Contributor suggestion status
Each contributor SHALL be able to see a list of their suggestions with each one's note, summary, status (draft, pending, changes requested, merged, saved as copy, rejected), and the reviewer's feedback.

#### Scenario: View rejection feedback
- **WHEN** a reviewer rejects a suggestion with feedback
- **THEN** the contributor's suggestion list shows it as rejected with that feedback

### Requirement: Review queue
Studio SHALL show reviewers a queue of pending suggestions, newest first, for the courses they review. A reviewer is the Super Admin or a course admin or editor of the note's course. Each queue item SHALL show the note, contributor, summary, submission time, and whether the note has changed since the suggestion was started.

#### Scenario: Course editor sees only their courses
- **WHEN** a course editor of course X opens the review queue
- **THEN** the queue lists pending suggestions for notes in course X and none from other courses

#### Scenario: Stale suggestion flagged
- **WHEN** a pending suggestion's base version is no longer the note's current version
- **THEN** the queue item shows an "Outdated base, note changed since" badge

### Requirement: Suggestion diff view
Opening a suggestion SHALL show its changes against its base version in two modes: a rendered view that highlights added, removed and changed sections, and an HTML source line diff. Attached annotations SHALL be shown as a toggleable overlay on the proposed version.

#### Scenario: Rendered diff
- **WHEN** a reviewer opens a suggestion that added a Case Study and changed one paragraph
- **THEN** the rendered view marks the Case Study as added and the paragraph as changed, showing both old and new text

#### Scenario: Source diff
- **WHEN** the reviewer switches to "Source"
- **THEN** the system shows a line diff of the base and proposed HTML with added and removed lines marked

### Requirement: Merge suggestion into current note
A reviewer SHALL be able to merge a pending suggestion. If its base is the current version, the proposed content SHALL be published as a new version. If the note has changed since, the system SHALL auto-merge non-overlapping changes and ask the reviewer to choose for each conflict before publishing.

#### Scenario: Merge onto unchanged note
- **WHEN** the reviewer clicks "Merge into note" on a suggestion whose base is the current version
- **THEN** the system publishes the proposed HTML as a new current version credited to the contributor and merged by the reviewer, and marks the suggestion merged

#### Scenario: Merge with conflicts
- **WHEN** the reviewer merges a stale suggestion and both the suggestion and a later published version changed the same section
- **THEN** the system shows each conflicting section with "Keep current" and "Use suggestion" choices, and publishes only after every conflict is resolved

#### Scenario: Merge with attached annotations
- **WHEN** the reviewer merges a suggestion that carries annotations and ticks "Publish annotations"
- **THEN** the annotations are published as the new version's shared annotation layer, which readers can toggle on and off

### Requirement: Save suggestion as a separate copy
A reviewer SHALL be able to accept a suggestion as a new note instead of merging it. The copy SHALL be placed in the same module and titled "<original title> (<contributor name>'s version)", with the title editable before confirming. It SHALL record which note and version it came from, and both notes SHALL link to each other.

#### Scenario: Fork a suggestion
- **WHEN** the reviewer clicks "Save as separate copy" and confirms the title
- **THEN** the system creates a new note whose first published version is the proposed HTML, leaves the original note unchanged, marks the suggestion "saved as copy" with a link to the new note, and the original note shows a "Copies of this note" link

### Requirement: Reject or request changes
A reviewer SHALL be able to reject a suggestion or request changes; both require written feedback. A rejected suggestion SHALL be closed. A suggestion with changes requested SHALL go back to the contributor as an editable draft, keeping the feedback.

#### Scenario: Request changes
- **WHEN** the reviewer clicks "Request changes" and enters feedback
- **THEN** the suggestion leaves the queue, the contributor can edit it again with the feedback shown at the top, and can resubmit it

#### Scenario: Feedback required
- **WHEN** the reviewer tries to reject or request changes with empty feedback
- **THEN** the system blocks the action and asks for feedback
