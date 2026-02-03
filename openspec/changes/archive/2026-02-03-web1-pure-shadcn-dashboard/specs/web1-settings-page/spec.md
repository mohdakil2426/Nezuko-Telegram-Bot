## ADDED Requirements

### Requirement: Appearance Section

The system SHALL display appearance settings in a dedicated section.

#### Scenario: Appearance card

- **WHEN** settings page loads
- **THEN** "Appearance" section is displayed with:
  - Section title
  - Theme selector
  - Divider

### Requirement: Theme Selector

The system SHALL allow selecting between light, dark, and system themes.

#### Scenario: Theme options

- **WHEN** theme selector is rendered
- **THEN** options include:
  - Light
  - Dark
  - System (follows OS preference)

#### Scenario: Theme change

- **WHEN** user selects a theme
- **THEN** theme is applied immediately
- **AND** preference is persisted in localStorage

### Requirement: Theme Preview

The system SHALL show visual preview of theme options.

#### Scenario: Theme preview display

- **WHEN** theme selector is rendered
- **THEN** each option shows small preview:
  - Light: white background preview
  - Dark: dark background preview
  - System: half light/half dark preview

### Requirement: Preferences Section

The system SHALL display user preferences toggles.

#### Scenario: Preferences rendering

- **WHEN** settings page loads
- **THEN** "Preferences" section shows:
  - Compact Mode toggle (Switch)
  - Reduce Motion toggle (Switch)

### Requirement: Compact Mode Toggle

The system SHALL allow enabling compact mode for denser UI.

#### Scenario: Compact mode toggle

- **WHEN** user toggles Compact Mode switch
- **THEN** preference is saved
- **AND** visual feedback (toast) confirms change

### Requirement: Reduce Motion Toggle

The system SHALL allow disabling animations for accessibility.

#### Scenario: Reduce motion toggle

- **WHEN** user toggles Reduce Motion switch
- **THEN** preference is saved
- **AND** animations are disabled throughout app

### Requirement: Settings Page Layout

The system SHALL organize settings in clear card sections.

#### Scenario: Layout structure

- **WHEN** settings page is rendered
- **THEN** layout shows:
  1. Page header with title "Settings"
  2. Appearance card section
  3. Preferences card section

### Requirement: Toggle Row Pattern

The system SHALL use consistent toggle row pattern for switches.

#### Scenario: Toggle row structure

- **WHEN** a toggle setting is rendered
- **THEN** row displays:
  - Label text (left)
  - Description text (muted, below label)
  - Switch control (right-aligned)

### Requirement: Section Cards

The system SHALL wrap setting groups in Card components.

#### Scenario: Card structure

- **WHEN** a settings section is rendered
- **THEN** Card contains:
  - CardHeader with title
  - CardContent with settings controls
  - Separators between items

### Requirement: Settings Persistence

The system SHALL persist all settings in localStorage.

#### Scenario: Settings save

- **WHEN** user changes any setting
- **THEN** value is saved to localStorage
- **AND** setting persists across page reloads

#### Scenario: Settings load

- **WHEN** settings page loads
- **THEN** current values are loaded from localStorage
- **AND** controls reflect saved state

### Requirement: Toast Notifications

The system SHALL show toast confirmation for setting changes.

#### Scenario: Save confirmation

- **WHEN** user changes a setting
- **THEN** toast appears confirming "Settings saved"
