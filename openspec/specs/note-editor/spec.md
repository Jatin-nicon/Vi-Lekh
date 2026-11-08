# note-editor Specification

## Purpose
Provides a Notion-style block editor for authoring and previewing technical notes with rich formatting, KaTeX math blocks, and code highlighting.

## Requirements

### Requirement: Block-based editing and slash commands
The editor SHALL provide a block-based WYSIWYG editing canvas where users can insert and manipulate blocks via a slash (`/`) command menu.

#### Scenario: Insert block via slash menu
- **WHEN** user types `/` in an empty block
- **THEN** system displays a menu of available block types including headings, code, math, and callouts

#### Scenario: Drag and rearrange blocks
- **WHEN** user drags a block by its drag handle to another vertical position
- **THEN** system moves the block to the selected position in the document tree

### Requirement: KaTeX mathematical equation rendering
The editor and reader views SHALL render mathematical expressions using KaTeX for both inline and display math equations.

#### Scenario: Render LaTeX formula
- **WHEN** user writes LaTeX syntax inside a math block or inline math delimiters
- **THEN** system compiles and renders the formula graphically without syntax errors

### Requirement: Syntax-highlighted code blocks
The editor SHALL support code blocks with syntax highlighting across standard programming languages including Python and JavaScript.

#### Scenario: Select programming language
- **WHEN** user creates a code block and selects Python
- **THEN** system applies Python syntax highlighting to keywords, strings, and comments

### Requirement: Structured block serialization
The system SHALL serialize document content as structured JSON blocks for persistence and diff comparison.

#### Scenario: Save document content
- **WHEN** user submits note content for saving
- **THEN** system converts the editor canvas state into a valid JSON block array
