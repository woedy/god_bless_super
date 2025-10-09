from django.urls import path

from phone_number_validator.api.views import load_phone_prefixes, validate_all_phone_numbers_free, validate_phone_number_free


app_name = 'phone_number_validator'

urlpatterns = [
    # Internal database validation endpoints only
    path('load-phone-prefixes/', load_phone_prefixes, name="load_phone_prefixes"),
    path('validate-number-id-free/', validate_phone_number_free, name="validate_phone_number_free"),
    path('start-validation-free/', validate_all_phone_numbers_free, name="validate_all_phone_numbers_free"),
]
