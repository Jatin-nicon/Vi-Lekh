# review-workflow Specification

## Purpose
Defines the hybrid review lifecycle, version tracking, proposal queue, and Core Team approval workflow for all community note contributions.

## Requirements

### Requirement: Hybrid edit routing
The system SHALL route note edits based on the author's role, automatically publishing Core Team changes and queueing contributor edits for review.

#### Scenario: Core Team member submits edit
- **WHEN** a user with the Core Team role publishes an edit to a note
- **THEN** the system updates the note's active revision pointer immediately and records the change in revision history

#### Scenario: Community contributor submits edit
- **WHEN** a user without Core Team privileges submits an edit to a note
- **THEN** the system creates a pending revision in the review queue and leaves the live published note unchanged

### Requirement: Visual block diff comparison
The system SHALL provide reviewers with a visual diff interface highlighting added, modified, and deleted blocks between the proposed and active revisions.

#### Scenario: Reviewer opens pending revision
- **WHEN** a reviewer views a pending revision in the review dashboard
- **THEN** the system displays changed blocks with visual color indicators for additions, modifications, and deletions

### Requirement: Revision approval and atomic pointer update
The system SHALL allow Core Team members to approve a pending revision, atomically updating the live note to point to the approved revision.

#### Scenario: Reviewer approves revision
- **WHEN** a Core Team member clicks "Approve and Merge" on a pending revision
- **THEN** the system updates the revision status to approved, sets the note's active revision pointer to the new revision, and records reviewer metadata

### Requirement: Revision rejection and feedback
The system SHALL allow Core Team members to reject or request changes on a pending revision with accompanying explanatory feedback.

#### Scenario: Reviewer requests changes
- **WHEN** a Core Team member requests changes with feedback notes
- **THEN** the system sets the revision status to changes requested, notifies the contributor, and preserves the feedback in the revision record
