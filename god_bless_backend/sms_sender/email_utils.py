from email.mime.text import MIMEText
import smtplib
import ssl
import time

from sms_sender.api.etext.exceptions import ProviderNotFoundException
from sms_sender.api.etext.providers import PROVIDERS


def send_sms_via_email(
    number: str,
    sender_name: str,
    subject: str,
    message: str,
    smtp,
    provider: str,
):
    sender_email = smtp.username
    email_password = smtp.password
    receiver_email = format_provider_email_address(number, provider)

    print(f"Sending SMS to: {receiver_email}")

    # Create the email message
    email_message = MIMEText(message)
    email_message["Subject"] = subject
    email_message["from"] = sender_name
    email_message["To"] = receiver_email

    try:
        # Create a connection to the SMTP server
        with smtplib.SMTP_SSL(
            smtp.host, smtp.port, context=ssl.create_default_context()
        ) as email:
            email.login(sender_email, email_password)
            email.sendmail(sender_email, receiver_email, email_message.as_string())
            print(f"Email successfully sent to {receiver_email}")

            #add data to databae
            

    except smtplib.SMTPException as e:
        print(f"Failed to send email: {e}")
        # Optionally, you could log the error or raise it to handle it in your application logic


def send_bulk_sms_via_email(
    numbers,
    sender_name: str,
    subject: str,
    message: str,
    smtps,
    provider: str,
    delay_seconds: int = 1  # Default delay of 1 second
):
    smtp_index = 0  # To keep track of the current SMTP configuration

    for number in numbers:
        # Get the current SMTP configuration
        smtp = smtps[smtp_index]
        sender_email = smtp.username
        email_password = smtp.password
        receiver_email = format_provider_email_address(number, provider)

        print(f"Sending SMS to: {receiver_email}")

        # Create the email message
        email_message = MIMEText(message)
        email_message["Subject"] = subject
        email_message["from"] = sender_name
        email_message["To"] = receiver_email

        try:
            # Create a connection to the SMTP server
            with smtplib.SMTP_SSL(
                smtp.host, smtp.port, context=ssl.create_default_context()
            ) as email:
                email.login(sender_email, email_password)
                email.sendmail(sender_email, receiver_email, email_message.as_string())
                print(f"Email successfully sent to {receiver_email}")
        except smtplib.SMTPException as e:
            print(f"Failed to send email: {e}")
            # Optionally, you could log the error or raise it to handle it in your application logic
        
        # Alternate to the next SMTP configuration
        smtp_index = (smtp_index + 1) % len(smtps)

        # Introduce a delay between sending each email
        print(f"Waiting for {delay_seconds} seconds before sending the next email...\n")
        time.sleep(delay_seconds)












def format_provider_email_address(number: str, provider: str):
    provider_info = PROVIDERS.get(provider)

    if provider_info == None:
        raise ProviderNotFoundException(provider)

    domain = provider_info.get("sms")

    number = number.replace(" ", "")

    number = number[1:]

    return f"{number}@{domain}"














import re

def replace_dynamic_placeholders(text, replacements):
    """
    This function will replace dynamic placeholders starting with @ in the text
    with corresponding values from the replacements dictionary.
    """
    # Use regex to match any placeholder starting with '@'
    def replace_placeholder(match):
        placeholder = match.group(1)  # Extract the placeholder name after '@'
        # Return the replacement value if it exists, else return the original placeholder
        return replacements.get(placeholder, match.group(0))  # Keep the placeholder if no replacement is found
    
    # Regex pattern to match placeholders that start with '@' and followed by alphanumeric characters
    pattern = r"@(\w+)"
    
    # Substitute matched placeholders with corresponding values from replacements
    result = re.sub(pattern, replace_placeholder, text)
    
    return result
