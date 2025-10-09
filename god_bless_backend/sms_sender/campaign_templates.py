"""
Campaign Template Library
Pre-built SMS templates for different verticals and use cases
"""

from typing import Dict, List
from dataclasses import dataclass


@dataclass
class CampaignTemplate:
    """Campaign template data structure"""
    id: str
    name: str
    category: str
    description: str
    message_template: str
    suggested_macros: List[str]
    use_case: str


# Template Categories
CATEGORY_MARKETING = "marketing"
CATEGORY_TRANSACTIONAL = "transactional"
CATEGORY_NOTIFICATION = "notification"
CATEGORY_PROMOTIONAL = "promotional"
CATEGORY_REMINDER = "reminder"
CATEGORY_VERIFICATION = "verification"


# Pre-built Campaign Templates
CAMPAIGN_TEMPLATES = {
    # Marketing Templates
    "flash_sale": CampaignTemplate(
        id="flash_sale",
        name="Flash Sale Alert",
        category=CATEGORY_MARKETING,
        description="Announce limited-time sales and promotions",
        message_template="🔥 FLASH SALE! @DISCOUNT% OFF @PRODUCT! Use code @CODE at checkout. Valid until @TIME today. Shop now: @LINK",
        suggested_macros=["DISCOUNT", "PRODUCT", "CODE", "TIME", "LINK"],
        use_case="E-commerce flash sales and limited-time offers"
    ),
    
    "new_product": CampaignTemplate(
        id="new_product",
        name="New Product Launch",
        category=CATEGORY_MARKETING,
        description="Announce new product launches",
        message_template="✨ NEW ARRIVAL! Introducing @PRODUCT - @DESCRIPTION. Be the first to get yours! @LINK",
        suggested_macros=["PRODUCT", "DESCRIPTION", "LINK"],
        use_case="Product launches and new inventory announcements"
    ),
    
    "seasonal_promo": CampaignTemplate(
        id="seasonal_promo",
        name="Seasonal Promotion",
        category=CATEGORY_PROMOTIONAL,
        description="Seasonal sales and holiday promotions",
        message_template="🎉 @SEASON Sale! Save @DISCOUNT% on @CATEGORY. Limited time only. Use code @CODE. Shop: @LINK",
        suggested_macros=["SEASON", "DISCOUNT", "CATEGORY", "CODE", "LINK"],
        use_case="Holiday and seasonal marketing campaigns"
    ),
    
    # Transactional Templates
    "order_confirmation": CampaignTemplate(
        id="order_confirmation",
        name="Order Confirmation",
        category=CATEGORY_TRANSACTIONAL,
        description="Confirm customer orders",
        message_template="Thank you @FIRSTNAME! Your order #@ORDERID has been confirmed. Total: $@AMOUNT. Track your order: @LINK",
        suggested_macros=["FIRSTNAME", "ORDERID", "AMOUNT", "LINK"],
        use_case="E-commerce order confirmations"
    ),
    
    "shipping_update": CampaignTemplate(
        id="shipping_update",
        name="Shipping Notification",
        category=CATEGORY_TRANSACTIONAL,
        description="Notify customers of shipping status",
        message_template="📦 Your order #@ORDERID has shipped! Track: @TRACKINGURL. Expected delivery: @DELIVERYDATE",
        suggested_macros=["ORDERID", "TRACKINGURL", "DELIVERYDATE"],
        use_case="Shipping and delivery notifications"
    ),
    
    "payment_received": CampaignTemplate(
        id="payment_received",
        name="Payment Confirmation",
        category=CATEGORY_TRANSACTIONAL,
        description="Confirm payment receipt",
        message_template="Payment received! Thank you @FIRSTNAME. Amount: $@AMOUNT. Ref: @REF. Questions? Reply or call @PHONE",
        suggested_macros=["FIRSTNAME", "AMOUNT", "REF", "PHONE"],
        use_case="Payment confirmations and receipts"
    ),
    
    # Notification Templates
    "appointment_reminder": CampaignTemplate(
        id="appointment_reminder",
        name="Appointment Reminder",
        category=CATEGORY_REMINDER,
        description="Remind customers of upcoming appointments",
        message_template="Reminder: You have an appointment with @BUSINESS on @DATE at @TIME. Location: @ADDRESS. Reply C to confirm.",
        suggested_macros=["BUSINESS", "DATE", "TIME", "ADDRESS"],
        use_case="Appointment reminders for service businesses"
    ),
    
    "event_reminder": CampaignTemplate(
        id="event_reminder",
        name="Event Reminder",
        category=CATEGORY_REMINDER,
        description="Remind attendees of upcoming events",
        message_template="🎫 @EVENT is tomorrow! @DATE at @TIME. Location: @VENUE. Your ticket: @TICKET. See you there!",
        suggested_macros=["EVENT", "DATE", "TIME", "VENUE", "TICKET"],
        use_case="Event reminders and ticket confirmations"
    ),
    
    "subscription_renewal": CampaignTemplate(
        id="subscription_renewal",
        name="Subscription Renewal",
        category=CATEGORY_NOTIFICATION,
        description="Notify about subscription renewals",
        message_template="Hi @FIRSTNAME, your @SERVICE subscription renews on @DATE for $@AMOUNT. Manage: @LINK",
        suggested_macros=["FIRSTNAME", "SERVICE", "DATE", "AMOUNT", "LINK"],
        use_case="Subscription and membership renewals"
    ),
    
    # Verification Templates
    "verification_code": CampaignTemplate(
        id="verification_code",
        name="Verification Code",
        category=CATEGORY_VERIFICATION,
        description="Send verification codes",
        message_template="Your @COMPANY verification code is: @CODE. Valid for @MINUTES minutes. Do not share this code.",
        suggested_macros=["COMPANY", "CODE", "MINUTES"],
        use_case="Two-factor authentication and account verification"
    ),
    
    "password_reset": CampaignTemplate(
        id="password_reset",
        name="Password Reset",
        category=CATEGORY_VERIFICATION,
        description="Password reset notifications",
        message_template="@COMPANY password reset requested. Code: @CODE. Didn't request this? Contact support immediately.",
        suggested_macros=["COMPANY", "CODE"],
        use_case="Password reset and account security"
    ),
    
    # Customer Engagement Templates
    "feedback_request": CampaignTemplate(
        id="feedback_request",
        name="Feedback Request",
        category=CATEGORY_NOTIFICATION,
        description="Request customer feedback",
        message_template="Hi @FIRSTNAME! How was your experience with @PRODUCT? Rate us: @LINK. Your feedback helps us improve!",
        suggested_macros=["FIRSTNAME", "PRODUCT", "LINK"],
        use_case="Customer satisfaction surveys"
    ),
    
    "loyalty_reward": CampaignTemplate(
        id="loyalty_reward",
        name="Loyalty Reward",
        category=CATEGORY_PROMOTIONAL,
        description="Reward loyal customers",
        message_template="🎁 @FIRSTNAME, you've earned @POINTS points! Redeem for @REWARD. Check your rewards: @LINK",
        suggested_macros=["FIRSTNAME", "POINTS", "REWARD", "LINK"],
        use_case="Loyalty programs and rewards"
    ),
    
    "cart_abandonment": CampaignTemplate(
        id="cart_abandonment",
        name="Cart Abandonment",
        category=CATEGORY_MARKETING,
        description="Recover abandoned carts",
        message_template="You left @ITEMS in your cart! Complete your order now and save @DISCOUNT%. @LINK",
        suggested_macros=["ITEMS", "DISCOUNT", "LINK"],
        use_case="E-commerce cart recovery"
    ),
    
    # Service Updates
    "service_update": CampaignTemplate(
        id="service_update",
        name="Service Update",
        category=CATEGORY_NOTIFICATION,
        description="Notify about service changes",
        message_template="@COMPANY Update: @MESSAGE. Effective @DATE. Questions? Visit @LINK or call @PHONE",
        suggested_macros=["COMPANY", "MESSAGE", "DATE", "LINK", "PHONE"],
        use_case="Service announcements and updates"
    ),
    
    "maintenance_alert": CampaignTemplate(
        id="maintenance_alert",
        name="Maintenance Alert",
        category=CATEGORY_NOTIFICATION,
        description="Notify about scheduled maintenance",
        message_template="⚠️ Scheduled maintenance: @SERVICE will be unavailable on @DATE from @STARTTIME to @ENDTIME. We apologize for any inconvenience.",
        suggested_macros=["SERVICE", "DATE", "STARTTIME", "ENDTIME"],
        use_case="System maintenance notifications"
    ),
}


# Available Macros with descriptions
AVAILABLE_MACROS = {
    # Personal Information
    "FIRSTNAME": "Recipient's first name",
    "LASTNAME": "Recipient's last name",
    "FULLNAME": "Recipient's full name",
    "EMAIL": "Recipient's email address",
    
    # Business Information
    "COMPANY": "Company or business name",
    "BUSINESS": "Business name",
    "BRAND": "Brand name",
    
    # Order & Transaction
    "ORDERID": "Order ID or number",
    "AMOUNT": "Transaction amount",
    "TOTAL": "Total amount",
    "REF": "Reference number",
    "TICKET": "Ticket number",
    "INVOICE": "Invoice number",
    
    # Product Information
    "PRODUCT": "Product name",
    "CATEGORY": "Product category",
    "ITEMS": "Number of items",
    "DESCRIPTION": "Product description",
    
    # Promotional
    "DISCOUNT": "Discount percentage or amount",
    "CODE": "Promo or coupon code",
    "REWARD": "Reward description",
    "POINTS": "Loyalty points",
    
    # Date & Time
    "DATE": "Date",
    "TIME": "Time",
    "DAY": "Day of week",
    "MONTH": "Month",
    "YEAR": "Year",
    "DELIVERYDATE": "Delivery date",
    "STARTTIME": "Start time",
    "ENDTIME": "End time",
    
    # Location
    "ADDRESS": "Street address",
    "CITY": "City",
    "STATE": "State",
    "ZIP": "ZIP code",
    "VENUE": "Venue name",
    "LOCATION": "Location description",
    
    # Links & Contact
    "LINK": "Website link",
    "URL": "URL",
    "TRACKINGURL": "Tracking URL",
    "PHONE": "Phone number",
    
    # Events & Services
    "EVENT": "Event name",
    "SERVICE": "Service name",
    "SEASON": "Season (Spring, Summer, etc.)",
    "MESSAGE": "Custom message",
    
    # Verification
    "MINUTES": "Time in minutes",
}


def get_template_by_id(template_id: str) -> CampaignTemplate:
    """Get a template by its ID"""
    return CAMPAIGN_TEMPLATES.get(template_id)


def get_templates_by_category(category: str) -> List[CampaignTemplate]:
    """Get all templates in a specific category"""
    return [t for t in CAMPAIGN_TEMPLATES.values() if t.category == category]


def get_all_templates() -> List[CampaignTemplate]:
    """Get all available templates"""
    return list(CAMPAIGN_TEMPLATES.values())


def get_all_categories() -> List[str]:
    """Get all template categories"""
    return [
        CATEGORY_MARKETING,
        CATEGORY_TRANSACTIONAL,
        CATEGORY_NOTIFICATION,
        CATEGORY_PROMOTIONAL,
        CATEGORY_REMINDER,
        CATEGORY_VERIFICATION,
    ]


def serialize_template(template: CampaignTemplate) -> Dict:
    """Serialize a template to dictionary"""
    return {
        "id": template.id,
        "name": template.name,
        "category": template.category,
        "description": template.description,
        "message_template": template.message_template,
        "suggested_macros": template.suggested_macros,
        "use_case": template.use_case,
    }


def serialize_all_templates() -> List[Dict]:
    """Serialize all templates to list of dictionaries"""
    return [serialize_template(t) for t in get_all_templates()]