# Spec Delta

## Purpose

Lets readers propose ideas on a note without editing it, through comments anchored to the text they are about, discussed in private threads with the course's reviewers.

## ADDED Requirements

### Requirement: Comment on a note
A signed-in reader SHALL be able to select text on a note, or pick a block, and add a comment of up to 2,000 characters. The comment SHALL record the note, the version it was made on, the quoted text and its position, and its author.

#### Scenario: Comment on selected text
- **WHEN** a signed-in reader selects a sentence and chooses "Comment", types an idea and posts it
- **THEN** the comment is saved with that sentence as its anchor and appears in the comments panel

#### Scenario: Signed-out visitor
- **WHEN** a signed-out visitor chooses "Comment"
- **THEN** the system asks them to sign in and saves nothing

#### Scenario: Empty comment
- **WHEN** a reader tries to post an empty comment
- **THEN** the comment is not posted

### Requirement: Comments are private to the commenter and reviewers
A comment and its replies SHALL be visible only to the comment's author and to the reviewers of the note's course (course admins and editors, and the Super Admin). The database SHALL enforce this.

#### Scenario: Another reader
- **WHEN** a reader who is not the author or a reviewer opens the note
- **THEN** they do not see the comment, and a direct database query does not return it

#### Scenario: Reviewer
- **WHEN** an editor of the note's course opens the note
- **THEN** they see the comment, its author and its replies

### Requirement: Reply to a comment
The comment's author and the course's reviewers SHALL be able to reply in the comment's thread. Replies SHALL be shown in order under the comment with author and time.

#### Scenario: Reviewer replies and author sees it
- **WHEN** a reviewer replies to a comment and the author later opens the note
- **THEN** the author sees the reply in the thread

### Requirement: Resolve and reopen
The comment's author or a reviewer SHALL be able to mark a thread resolved, and to reopen it. Resolved threads SHALL be hidden from the default list but still viewable.

#### Scenario: Resolve
- **WHEN** a reviewer marks a thread resolved
- **THEN** it leaves the open comments list and appears under resolved comments, with who resolved it

### Requirement: Edit and delete own comments
Authors SHALL be able to edit or delete their own comments and replies. Deleting a thread's first comment SHALL delete its replies.

#### Scenario: Delete own comment
- **WHEN** the author deletes their comment
- **THEN** the comment and its replies are removed for everyone

#### Scenario: Cannot change someone else's comment
- **WHEN** a user tries to edit or delete a comment written by someone else, even as a reviewer
- **THEN** the database rejects the change

### Requirement: Find a comment on the page
The reader SHALL show the number of open comment threads the user can see on the note, and a panel listing them. Choosing a thread SHALL scroll to its anchor and highlight it.

#### Scenario: Jump to a comment
- **WHEN** a reviewer opens the comments panel and chooses a thread
- **THEN** the note scrolls to the commented text and highlights it

#### Scenario: Anchor text changed
- **WHEN** the commented text no longer exists in the current version
- **THEN** the thread is still listed with its original quote and a note that it was made on an earlier version

### Requirement: Reviewers see open comments for their courses
Reviewers SHALL be able to see the open comment threads across the notes of the courses they review, newest first, next to the review queue.

#### Scenario: Open comments in the review area
- **WHEN** an editor of course X opens the review area
- **THEN** it lists open comment threads on course X's notes and none from other courses
