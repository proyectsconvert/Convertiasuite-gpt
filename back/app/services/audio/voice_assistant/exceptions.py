class VoiceError(Exception):
    """Base exception for voice assistant operations."""
    pass


class EmptyTranscriptError(VoiceError):
    """Raised when transcribed audio contains no text."""
    pass


class TranscriptionError(VoiceError):
    """Raised when audio transcription (STT) fails."""
    pass


class GreetingError(VoiceError):
    """Raised when voice greeting generation fails."""
    pass


class VoicePipelineError(VoiceError):
    """Raised when the voice turn pipeline encounters an error."""
    pass

