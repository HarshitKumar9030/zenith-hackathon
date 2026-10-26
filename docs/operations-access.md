# Operations access

Open `/app?view=Operations`. A signed-out visitor sees sign-in; a verified configured administrator returns to Operations after signing in. Sidebar navigation updates `view`, so refreshing preserves the open page. Helper administrators can also open Operations instead of being forced back to Helper dashboard.

The server's private `ADMIN_EMAILS` allowlist is authoritative. An allowlisted account must have verified its email (or have an existing explicit `adminApproved` flag for legacy setups). An email outside the allowlist cannot become an administrator through signup, a database role string, a URL or a client-side page change. Remove an address from `ADMIN_EMAILS` to revoke administrator authority, then redeploy the configuration. Production sessions still require email verification.

Previously, administrators provisioned in a fresh deployment needed a separate database approval flag, even when their verified email was explicitly allowlisted. That local-only dependency has been removed. Keep `ADMIN_EMAILS=harshitkumar9030@gmail.com` in the intended hosting environment, verify that account and deploy environment updates. Local and hosted MongoDB accounts are separate.

Operations now shows a loading state while permissions/data load and a visible Retry action on request failure, rather than briefly displaying a false access denial or silently leaving an empty workspace. Server-side role checks remain in the operations API.

Validation: navigation tests cover signed-out deep links, resident/helper administrators, normal resident/helper restrictions and helper settings. Role tests cover verified allowlisted accounts, unverified accounts, legacy explicit approval and unlisted accounts. API integration checks verified allowlisted admin access without the legacy flag.
