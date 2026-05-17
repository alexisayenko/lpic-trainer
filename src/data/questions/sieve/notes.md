# Sieve — Study Notes

LPIC-2 Topic 211 (Email Services). Source: LKB-2 LPIC-2. Sieve.

## Possible IF clauses (tests)

    allof ()                                      # all conditions must match
    address :count "over" :all "to" 5             # sent to more than 5 recipients
    address :is "from" "*.trustedpartner.com"     # exact-match address test
    address :is "to" "noreply@mydomain.com"
    header :contains "Subject" "free offer"       # substring match in a header
    header :contains "from" "@bulkmailers.com"
    header :matches "subject" "*meeting*"         # wildcard match
    size :over 5120                               # size threshold (KB)

## THEN part (actions)

    fileinto "Large Attachments";   # move message into a folder
    reject "This address does not accept incoming emails.";  # refuse + bounce
    addflag "\\Flagged";            # mark message (imap4flags extension)
    discard;                        # silently delete, no bounce-back

## Notes

- `allof(...)` requires every condition to match; `anyof(...)` requires any.
- A `!` prefix on a regex condition negates it (e.g. exclude a subject keyword).
- `discard` deletes silently; `reject` sends a bounce to the sender.
- `fileinto` cancels the implicit keep, so the message leaves the inbox.
