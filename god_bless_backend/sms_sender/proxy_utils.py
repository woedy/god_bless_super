import socket
import socks
from contextlib import contextmanager

@contextmanager
def proxy_socket_connection(proxy_config=None):
    """
    Context manager to route socket traffic through a SOCKS/HTTP proxy.
    
    Args:
        proxy_config (dict, optional): Dictionary containing proxy configuration:
            - host (str): Proxy hostname or IP
            - port (int): Proxy port
            - username (str, optional): Proxy username
            - password (str, optional): Proxy password
            - protocol (str, optional): 'http', 'socks4', 'socks5' (default: 'socks5')
    """
    original_socket = socket.socket
    
    if proxy_config and proxy_config.get('host'):
        try:
            # Determine proxy type
            protocol_map = {
                'http': socks.HTTP,
                'socks4': socks.SOCKS4,
                'socks5': socks.SOCKS5
            }
            
            # Default to SOCKS5 if not specified or unknown
            protocol_str = str(proxy_config.get('protocol', 'socks5')).lower()
            proxy_type = protocol_map.get(protocol_str, socks.SOCKS5)
            
            # Configure default proxy
            socks.set_default_proxy(
                proxy_type,
                proxy_config['host'],
                int(proxy_config['port']),
                username=proxy_config.get('username'),
                password=proxy_config.get('password')
            )
            
            # Patch the socket module
            socket.socket = socks.socksocket
            yield
            
        finally:
            # Restore original socket
            socket.socket = original_socket
            # Remove default proxy settings (socks doesn't have a clear 'unset', 
            # but restoring socket.socket stops new connections from using it)
            # To be safe, we can set it to None if the library supports it, 
            # but usually restoring the class is enough for patched modules.
            # socks.set_default_proxy() # specific clearing not always available/needed if we unpatch
            pass
    else:
        # No proxy, just yield
        yield
