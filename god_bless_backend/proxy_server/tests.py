from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .models import ProxyServer


class ProxyServerUpdateViewTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            email='proxy@example.com',
            username='proxy-user',
            password='super-secret-password'
        )
        self.client.force_authenticate(user=self.user)
        self.proxy = ProxyServer.objects.create(
            user=self.user,
            host='legacy.proxy.local',
            port=8080,
            protocol='http',
            is_active=True
        )

    def test_update_proxy_configuration(self):
        response = self.client.post(
            '/api/proxy-server/update/',
            {
                'user_id': self.user.user_id,
                'id': self.proxy.id,
                'host': 'modern.proxy.local',
                'port': 9090,
                'protocol': 'https',
                'is_active': False
            },
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.proxy.refresh_from_db()
        self.assertEqual(self.proxy.host, 'modern.proxy.local')
        self.assertEqual(self.proxy.port, 9090)
        self.assertEqual(self.proxy.protocol, 'https')
        self.assertFalse(self.proxy.is_active)

    def test_update_proxy_requires_valid_integer_port(self):
        response = self.client.post(
            '/api/proxy-server/update/',
            {
                'user_id': self.user.user_id,
                'id': self.proxy.id,
                'port': 'invalid'
            },
            format='json'
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('port', response.data.get('errors', {}))
