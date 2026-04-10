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
    action_color = "#4edea3" if action == "BUY" else "#ffb4ab"
    action_icon = "📈" if action == "BUY" else "📉"
    explorer_url = f"https://testnet.explorer.perawallet.app/tx/{tx_id}"
    html = f"""
    <div style="font-family: 'Courier New', monospace; background-color: #0B0E14; color: #e0e2ea; padding: 0; max-width: 600px; margin: auto; border-radius: 16px; overflow: hidden; border: 1px solid #2e3340;">
        <div style="background: linear-gradient(135deg, #1a2040 0%, #0d1525 100%); padding: 32px 40px; border-bottom: 1px solid #2e3340;">
            <p style="margin: 0 0 4px; font-size: 10px; color: #6c6e7e; letter-spacing: 3px; text-transform: uppercase;">TREND AI · MASTER TERMINAL</p>
            <h1 style="margin: 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: 1px;">Trade Execution Confirmed {action_icon}</h1>
        </div>
        <div style="padding: 32px 40px;">
            <div style="background: #131922; border: 1px solid #2e3340; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding: 10px 0; color: #8e90a2; font-size: 12px; letter-spacing: 1px; text-transform: uppercase;">Action</td>
                        <td style="padding: 10px 0; text-align: right; font-size: 20px; font-weight: 800; color: {action_color}; letter-spacing: 2px;">{action}</td>
                    </tr>
                    <tr style="border-top: 1px solid #2e3340;">
                        <td style="padding: 10px 0; color: #8e90a2; font-size: 12px; letter-spacing: 1px; text-transform: uppercase;">Asset</td>
                        <td style="padding: 10px 0; text-align: right; font-weight: 700; color: #e0e2ea;">ALGO / USD</td>
                    </tr>
                    <tr style="border-top: 1px solid #2e3340;">
                        <td style="padding: 10px 0; color: #8e90a2; font-size: 12px; letter-spacing: 1px; text-transform: uppercase;">Amount</td>
                        <td style="padding: 10px 0; text-align: right; font-weight: 700; color: #e0e2ea;">{amount} ALGO</td>
                    </tr>
                    <tr style="border-top: 1px solid #2e3340;">
                        <td style="padding: 10px 0; color: #8e90a2; font-size: 12px; letter-spacing: 1px; text-transform: uppercase;">Network</td>
                        <td style="padding: 10px 0; text-align: right; font-weight: 700; color: #b8c3ff;">Algorand Testnet</td>
                    </tr>
                    <tr style="border-top: 1px solid #2e3340;">
                        <td style="padding: 10px 0; color: #8e90a2; font-size: 12px; letter-spacing: 1px; text-transform: uppercase;">TX Hash</td>
                        <td style="padding: 10px 0; text-align: right; font-size: 10px; font-family: monospace; color: #4edea3; word-break: break-all;">{tx_id}</td>
                    </tr>
                </table>
            </div>
            <a href="{explorer_url}" style="display: block; text-align: center; background: linear-gradient(135deg, #2b5bff, #4edea3); color: #ffffff; font-weight: 800; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; text-decoration: none; padding: 16px 32px; border-radius: 10px;">
                Verify On-Chain ↗
            </a>
            <p style="margin-top: 24px; font-size: 11px; color: #6c6e7e; text-align: center; letter-spacing: 1px;">
                This trade was executed autonomously by your Trend AI Autopilot Engine.<br>
                You can disable Autopilot at any time from the Master Terminal dashboard.
            </p>
        </div>
    </div>
    """
    send_custom_email(to_email, f"[Trend AI] {action} Trade Executed · {amount} ALGO", html)

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
