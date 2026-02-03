## ADDED Requirements

### Requirement: Groups Data Table

The system SHALL display protected groups in a TanStack React Table with full functionality.

#### Scenario: Table rendering

- **WHEN** groups page loads
- **THEN** data table displays with columns:
  - Checkbox (row selection)
  - Group Name (sortable)
  - Members (sortable, right-aligned)
  - Linked Channels (count)
  - Status (badge: Active/Paused)
  - Actions (dropdown menu)

### Requirement: Table Sorting

The system SHALL support column sorting.

#### Scenario: Sort by group name

- **WHEN** user clicks "Group Name" column header
- **THEN** rows sort alphabetically by name
- **AND** sort indicator shows direction (asc/desc)

#### Scenario: Sort by members

- **WHEN** user clicks "Members" column header
- **THEN** rows sort numerically by member count

### Requirement: Table Search Filter

The system SHALL support searching/filtering groups by name.

#### Scenario: Search filter

- **WHEN** user types in search input
- **THEN** table filters to show only matching groups
- **AND** filter is case-insensitive

### Requirement: Table Pagination

The system SHALL paginate groups list with configurable page size.

#### Scenario: Pagination controls

- **WHEN** groups table is rendered
- **THEN** pagination shows:
  - Current page / total pages
  - Previous/Next buttons
  - First/Last buttons
  - Rows per page selector (10, 20, 50)

#### Scenario: Page navigation

- **WHEN** user clicks "Next" button
- **THEN** table shows next page of results

### Requirement: Row Selection

The system SHALL support single and multi-row selection.

#### Scenario: Select single row

- **WHEN** user clicks row checkbox
- **THEN** row is selected with visual indication

#### Scenario: Select all rows

- **WHEN** user clicks header checkbox
- **THEN** all visible rows are selected

#### Scenario: Selection counter

- **WHEN** rows are selected
- **THEN** footer shows "X of Y row(s) selected"

### Requirement: Row Actions Dropdown

The system SHALL provide actions for each group row.

#### Scenario: Actions menu

- **WHEN** user clicks actions button (three dots)
- **THEN** dropdown menu appears with:
  - View Details
  - Edit Settings
  - Toggle Protection (Enable/Disable)
  - Separator
  - Delete (destructive style)

### Requirement: Status Badge Display

The system SHALL display group status as a styled badge.

#### Scenario: Active status

- **WHEN** group has `enabled: true`
- **THEN** status badge shows "Active" with green styling

#### Scenario: Paused status

- **WHEN** group has `enabled: false`
- **THEN** status badge shows "Paused" with muted styling

### Requirement: Column Visibility Toggle

The system SHALL allow hiding/showing columns.

#### Scenario: Column visibility menu

- **WHEN** user clicks "Columns" dropdown
- **THEN** checkbox list of columns appears
- **AND** user can toggle column visibility

### Requirement: Page Header

The system SHALL display a page header with title and actions.

#### Scenario: Header content

- **WHEN** groups page is rendered
- **THEN** header shows:
  - Title: "Protected Groups"
  - Description: Brief explanation
  - Add Group button (placeholder)

### Requirement: Empty State

The system SHALL display an empty state when no groups exist.

#### Scenario: No groups

- **WHEN** groups list is empty
- **THEN** table shows centered empty state message
- **AND** suggests adding a group

### Requirement: Loading State

The system SHALL display skeleton loader while groups load.

#### Scenario: Table loading

- **WHEN** groups data is loading
- **THEN** skeleton rows are displayed
- **AND** skeleton has same column structure as real table
