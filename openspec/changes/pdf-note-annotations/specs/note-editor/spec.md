# Spec Delta

## MODIFIED Requirements

### Requirement: Structured block serialization
The system SHALL serialize note content supporting uploaded PDF document references and metadata, persisting changes live to the note revision record without intermediate review queues.

#### Scenario: Save document content
- **WHEN** an authorized editor uploads and publishes a PDF lecture document
- **THEN** the system persists the file URL, page count, and title directly to the live note revision record immediately

#### Scenario: Migrate legacy note blocks on load
- **WHEN** an editor opens a note previously saved in the legacy block format
- **THEN** the system automatically compiles the block array into unified document content for viewing or PDF replacement

## ADDED Requirements

### Requirement: PDF lecture document upload
The Creator Studio and note management workflows SHALL provide an intuitive interface for uploading PDF documents (via drag-and-drop or local file browser) to attach to a course module.

#### Scenario: Upload PDF file in Creator Studio
- **WHEN** an author drops or selects a `.pdf` file in the note publishing workspace
- **THEN** the system validates the file format and size, uploads the file to storage, and generates a preview with page count and title

#### Scenario: Reject non-PDF file upload
- **WHEN** an author attempts to upload a non-PDF file (e.g. `.exe` or `.txt`)
- **THEN** the system rejects the upload with an informative validation error explaining that only PDF documents are supported
