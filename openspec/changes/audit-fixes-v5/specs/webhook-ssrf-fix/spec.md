## ADDED Requirements

### Requirement: URL validation in test-webhook
The `test-webhook` edge function SHALL validate that the provided URL is a valid HTTPS URL before making any HTTP requests.

#### Scenario: Valid HTTPS URL accepted
- **WHEN** a valid HTTPS URL is provided (e.g., `https://example.com/webhook`)
- **THEN** the function SHALL proceed to test the webhook

#### Scenario: HTTP URL rejected
- **WHEN** an HTTP (non-HTTPS) URL is provided
- **THEN** the function SHALL return a 400 error with message "Only HTTPS URLs are allowed"

#### Scenario: Internal IP blocked
- **WHEN** a URL resolving to a private IP range (10.x, 172.16-31.x, 192.168.x, 127.x, ::1) is provided
- **THEN** the function SHALL return a 400 error with message "Internal URLs are not allowed"

### Requirement: URL scheme allowlist
The function SHALL only allow `https://` scheme. All other schemes (`http://`, `ftp://`, `file://`, `data://`) SHALL be rejected.

#### Scenario: Data URI rejected
- **WHEN** a `data://` URI is provided
- **THEN** the function SHALL return a 400 error
