from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .models import ProxyServer


class ProxyServerViewSetTests(APITestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(
            email='proxy@example.com',
            username='proxy-user',
            password='super-secret-password'
        )
        self.other_user = User.objects.create_user(
            email='other@example.com',
            username='other-user',
            password='another-secret-password'
        )
        self.client.force_authenticate(user=self.user)

    def test_create_lists_and_updates_user_scoped_proxy(self):
        list_url = '/api/proxy-server/api/'
        create_response = self.client.post(
            list_url,
            {
                'host': 'api.proxy.local',
                'port': 8080,
                'protocol': 'http',
                'username': 'service',
                'password': 'secret',
                'is_active': True
            },
            format='json'
        )
        self.assertEqual(create_response.status_code, status.HTTP_201_CREATED)
        proxy_id = create_response.data['id']

        # Another user should not see this proxy
        ProxyServer.objects.create(
            user=self.other_user,
            host='other.proxy.local',
            port=9000,
            protocol='https'
        )

        list_response = self.client.get(list_url)
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(list_response.data), 1)
        self.assertEqual(list_response.data[0]['host'], 'api.proxy.local')

        # Update the proxy via PATCH
        detail_url = f'/api/proxy-server/api/{proxy_id}/'
        update_response = self.client.patch(
            detail_url,
            {'protocol': 'https', 'port': 9090},
            format='json'
        )
        self.assertEqual(update_response.status_code, status.HTTP_200_OK)

        proxy = ProxyServer.objects.get(id=proxy_id)
        self.assertEqual(proxy.protocol, 'https')
        self.assertEqual(proxy.port, 9090)
        self.assertEqual(proxy.user, self.user)

    def test_delete_requires_ownership(self):
        proxy = ProxyServer.objects.create(
            user=self.other_user,
            host='forbidden.proxy.local',
            port=7000,
            protocol='http'
        )

        response = self.client.delete(f'/api/proxy-server/api/{proxy.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(ProxyServer.objects.filter(id=proxy.id).exists())

        owned_proxy = ProxyServer.objects.create(
            user=self.user,
            host='owned.proxy.local',
            port=7500,
            protocol='http'
        )
        delete_response = self.client.delete(f'/api/proxy-server/api/{owned_proxy.id}/')
        self.assertEqual(delete_response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(ProxyServer.objects.filter(id=owned_proxy.id).exists())
