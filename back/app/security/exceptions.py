
class SecurityException(Exception):
    pass


class PromptInjectionException(SecurityException):
    pass


class OutputLeakException(SecurityException):
    pass


class RateLimitException(SecurityException):
    pass


class PolicyViolationException(SecurityException):
    pass
