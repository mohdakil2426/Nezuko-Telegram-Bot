// commitlint.config.mjs
// Conventional Commits specification: https://www.conventionalcommits.org/
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Allowed commit types — must match one of these
    "type-enum": [
      2,
      "always",
      [
        "feat", // New feature
        "fix", // Bug fix
        "docs", // Documentation only
        "style", // Formatting, no logic change (prettier, lint fix)
        "refactor", // Code change — not a feature or bug fix
        "perf", // Performance improvement
        "test", // Adding or fixing tests
        "build", // Build system or external dependency changes
        "ci", // CI/CD configuration changes
        "chore", // Maintenance tasks (bumps, tooling)
        "revert", // Reverts a previous commit
      ],
    ],
    // Subject (description) must be lowercase
    "subject-case": [2, "always", "lower-case"],
    // Subject must not end with a period
    "subject-full-stop": [2, "never", "."],
    // Subject must not be empty
    "subject-empty": [2, "never"],
    // Type must not be empty
    "type-empty": [2, "never"],
    // Header max 100 chars (matches prettier line length)
    "header-max-length": [2, "always", 100],
    // Body lines max 100 chars
    "body-max-line-length": [1, "always", 100],
  },
  // Allow bot-generated commits without conventional format
  ignores: [
    // Our CI auto-fix commits
    (commit) => commit.includes("[skip ci]"),
    // Dependabot PRs
    (commit) => commit.startsWith("chore(deps)"),
    // Release Please commits
    (commit) => commit.startsWith("chore(release)"),
    (commit) => commit.startsWith("release:"),
  ],
};
