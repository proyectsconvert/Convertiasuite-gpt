type VoiceButtonProps = {
    onPress:() => void
}

function VoiceButton({ onPress}: VoiceButtonProps){
    return (
        <button onClick={onPress}>
            iniciar conversación
        </button>
    )
}
export default VoiceButton
  