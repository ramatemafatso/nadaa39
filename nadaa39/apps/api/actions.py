"""Native action contract used by mobile/desktop shells.

The web app returns handoff instructions; platform shells implement the actual OS calls.
"""

ACTIONS = {
    "open_whatsapp": "SAFE",
    "open_url": "SAFE",
    "call_phone": "CONFIRM",
    "send_whatsapp": "CONFIRM",
    "delete_file": "CONFIRM",
}
