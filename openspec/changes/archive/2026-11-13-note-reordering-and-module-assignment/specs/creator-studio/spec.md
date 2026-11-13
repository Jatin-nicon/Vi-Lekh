# Spec Delta

## ADDED Requirements

### Requirement: Note reordering within modules
The Creator Studio SHALL allow authorized course editors to reorder notes within a module using drag-and-drop handles or Move Up and Move Down buttons.

#### Scenario: Editor reorders note via Move Up or Down buttons
- **WHEN** an authorized editor clicks the Move Up or Move Down button on a note item in /studio
- **THEN** the system immediately updates the displayed sequence of notes and persists the new order_index values to Supabase

#### Scenario: Editor reorders note via drag and drop
- **WHEN** an authorized editor drags a note by its grip handle and drops it at a new position within the module list
- **THEN** the system reorders the notes list optimistically and updates the persistent note ordering in the database

#### Scenario: Boundary note controls
- **WHEN** a note is at the top of a module list
- **THEN** its Move Up button is disabled
- **WHEN** a note is at the bottom of a module list
- **THEN** its Move Down button is disabled

### Requirement: Note module reassignment
The Creator Studio SHALL allow authorized course editors to reassign a note from one module to another or to unassigned status.

#### Scenario: Editor opens module reassignment modal via action button or double-click
- **WHEN** an authorized editor clicks the Move action button or double-clicks a note row in /studio
- **THEN** the system displays a modal dialog listing all course modules and an unassigned option

#### Scenario: Editor moves note to another module
- **WHEN** an authorized editor selects a target module and confirms the move in the modal
- **THEN** the note is moved to the target module, assigned the next available order index in that module, and updated in Supabase

#### Scenario: Editor assigns an unassigned note to a module
- **WHEN** an authorized editor selects a module for a note currently listed under Unassigned Notes
- **THEN** the note is transferred into the chosen module and removed from the unassigned list

