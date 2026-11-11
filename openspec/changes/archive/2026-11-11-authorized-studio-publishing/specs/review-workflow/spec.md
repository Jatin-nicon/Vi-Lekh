# Spec Delta

## REMOVED Requirements

### Requirement: Hybrid edit routing
**Reason**: Replaced by direct live publishing restricted to Super Admin and authorized Course Editors in Creator Studio. Community suggestion queues are eliminated to maintain high technical documentation authority.
**Migration**: Authorized editors edit and publish live directly using the block editor. Unauthorized users no longer have an edit suggestion option.

### Requirement: Visual block diff comparison
**Reason**: The /reviews route and pending revision diff viewer are decommissioned with the removal of the community suggestion queue.
**Migration**: Note changes are managed directly by authorized editors; no intermediate revision diff review dashboard is used.

### Requirement: Revision approval and atomic pointer update
**Reason**: Approval and merge actions are no longer required as only authorized editors publish notes directly to live.
**Migration**: Content updates are written directly to active note records upon save by authorized editors.

### Requirement: Revision rejection and feedback
**Reason**: Community revision proposals and change requests are eliminated.
**Migration**: Content curation occurs within the authorized team in Creator Studio.

