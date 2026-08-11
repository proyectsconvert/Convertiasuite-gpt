let speaking = false;

export function hablar(
  texto : string,
  onStart?:() =>void,
  onEnd?:() => void
){
  if (!("speechSynthesis" in window)) {
  console.warn("SpeechSynthesis no soportado");
  return;
}

  window.speechSynthesis.cancel();

  const speech = new SpeechSynthesisUtterance(texto);

  speech.lang = "es-ES";
  speech.rate = 1;
  speech.pitch = 1;
  speech.volume = 1;

  speaking = true;
 onStart?.();
  speech.onend = () => {
    speaking = false;
    onEnd?.();
    
  };

  speech.onerror = () => {
    speaking = false;
    onEnd?.(); 
  };

  window.speechSynthesis.speak(speech);
}

export function detenerHabla() {
  window.speechSynthesis.cancel();
  speaking = false;
}

export function estaHablando() {
  return speaking;
}