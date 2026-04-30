from slowapi import Limiter
from slowapi.util import get_remote_address

# Limitador global para usar en los routers
limiter = Limiter(key_func=get_remote_address)
 

