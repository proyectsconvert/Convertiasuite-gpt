#exepciones de seguridad para el sistema de detección de ataques a LLMs

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
