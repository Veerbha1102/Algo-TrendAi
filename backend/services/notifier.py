import os
import resend
from firebase_admin import messaging

resend.api_key = os.environ.get("RESEND_API_KEY", "")

def send_custom_email(to_email: str, subject: str, html_content: str):
    try:
        if not resend.api_key:
            print("Missing Resend API Key. Email skipped.")
            return
        
        response = resend.Emails.send({
            "from": "AlgoPilot AI <onboarding@resend.dev>",
            "to": to_email,
            "subject": subject,
            "html": html_content
        })
        print(f"Email sent successfully: {response}")
    except Exception as e:
        print(f"Failed to send email: {e}")

def send_trade_alert(to_email: str, action: str, amount: float, tx_id: str):
    html = f"""
    <div style="font-family: system-ui, sans-serif; background-color: #101419; color: #e0e2ea; padding: 40px; border-radius: 12px; max-width: 600px; margin: auto;">
        <h2 style="color: #b8c3ff; margin-bottom: 24px;">AlgoPilot Automation Alert</h2>
        <p>A smart contract constraint was cleared and your quantitative bot has executed a trade.</p>
        <div style="background-color: #1c2025; padding: 20px; border-radius: 8px; margin: 24px 0; border: 1px solid #434656;">
            <p><strong>Action:</strong> <span style="color: {'#4edea3' if action == 'BUY' else '#ffb4ab'};">{action}</span></p>
            <p><strong>Amount:</strong> {amount} ALGO</p>
            <p style="font-size: 12px; color: #c4c5d9;">TX Hash: {tx_id}</p>
        </div>
        <p style="font-size: 12px; color: #8e90a2;">You are receiving this because you enabled Live Trade Protection.</p>
    </div>
    """
    send_custom_email(to_email, f"Executed {action} for {amount} ALGO", html)

def send_push_notification(device_token: str, title: str, body: str):
    if not device_token:
        return
    try:
        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            token=device_token,
        )
        response = messaging.send(message)
        print(f"Successfully sent FCP push message: {response}")
    except Exception as e:
        print(f"Push error: {e}")
