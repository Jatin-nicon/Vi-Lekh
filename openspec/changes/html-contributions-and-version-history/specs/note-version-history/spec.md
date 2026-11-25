# Spec Delta

## Purpose

Keeps every published version of a note permanently. Users can browse and compare them, and reviewers can restore any earlier version in one click without losing any history.

## ADDED Requirements

### Requirement: Immutable published versions
Every publish SHALL create a new version record whose content never changes afterwards. A publish is a direct edit, a merged suggestion, a fork's first version, or a restore. The system SHALL NOT delete or overwrite published versions as part of editing, merging or restoring.

#### Scenario: Edit keeps the previous version
- **WHEN** an editor publishes a change to a note
- **THEN** the previous version still exists with its original content and appears in the note's history

#### Scenario: Direct update of version content refused
- **WHEN** any client attempts to update the content of an existing published version
- **THEN** the database rejects the update

### Requirement: Version history timeline
The note reader SHALL offer a "History" panel listing the note's published versions, newest first. Each entry SHALL show the version number, date, author, the reviewer who merged it (if any), the summary, and its source: direct edit, merged suggestion, restored from vN, or created as copy of a note. The current version SHALL be marked.

#### Scenario: Open history
- **WHEN** a user opens the History panel on a note with five published versions
- **THEN** the panel lists v5 to v1 with their metadata, and v5 is marked current

#### Scenario: Restored entry is labelled
- **WHEN** v6 was created by restoring v3
- **THEN** the v6 entry reads "Restored from v3" and names who restored it

### Requirement: View a past version
A user SHALL be able to open any listed version read-only in the reader, with a banner showing its number and date and a "Back to current" action. Annotation tools SHALL be disabled while a past version is shown.

#### Scenario: View v2
- **WHEN** a user selects v2 in the History panel
- **THEN** the reader shows v2's content with a "Viewing v2 from <date>, not the current version" banner and annotation tools disabled

### Requirement: Compare two versions
A user SHALL be able to compare any two versions of a note, using the same rendered and source diff views as suggestion review.

#### Scenario: Compare v2 with current
- **WHEN** a user chooses "Compare with current" on v2
- **THEN** the system shows the changes from v2 to the current version in rendered and source modes

### Requirement: One-click restore
Reviewers of the note's course SHALL be able to restore any past version with one click and a confirmation. Restoring SHALL publish a new version with the old content, marked as restored from that version, and SHALL leave all existing versions in place.

#### Scenario: Restore v3
- **WHEN** a reviewer clicks "Restore this version" on v3 of a note whose current version is v5 and confirms
- **THEN** the system publishes v6 with v3's content, marked "Restored from v3", makes v6 current, and v4 and v5 remain in history

#### Scenario: Undo a restore
- **WHEN** the reviewer then restores v5
- **THEN** the system publishes v7 with v5's content, so the restore is reversible in one click

#### Scenario: Reader cannot restore
- **WHEN** a user who is not a reviewer of the course views the History panel
- **THEN** the panel shows view and compare actions but no restore action, and a direct restore attempt is rejected by the database

### Requirement: Pending suggestions survive history changes
Publishing a version, including through a restore, SHALL NOT discard pending suggestions. They SHALL stay pending against their original base and be flagged as outdated.

#### Scenario: Restore while a suggestion is pending
- **WHEN** a reviewer restores an old version while a suggestion based on the previous current version is pending
- **THEN** the suggestion remains in the queue with the "Outdated base" badge and can still be merged through conflict resolution
