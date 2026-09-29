function obtenerVozFemenina(){
  const voces = window.speechSynthesis.getVoices();
  const vozFemenina = voces.find(
    (voz) =>
      voz.lang.includes("es")&&
    (
      voz.name.toLowerCase().includes("female") ||
      voz.name.toLocaleLowerCase().includes("woman") ||
      voz.name.toLocaleLowerCase().includes("maria") ||
      voz.name.toLocaleLowerCase().includes("helena")
    )
  );
  return(
    vozFemenina ||
    voces.find(
      (voz) => voz.lang.startsWith("es")
    )
  )
}
function limpiarTextoParaVoz(texto: string) {
  return texto
    .replace(/```[\s\S]*?```/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/#+\s/g, "")
    .replace(/[-•]/g, "")
    .replace(/\n+/g, ". ")
    .trim();
}


let speaking = false;

export function hablar (
  texto : string,
  onStart?:()=>void,
  onEnd?:()=> void
){
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();

  const limpio = limpiarTextoParaVoz(texto);

  const speech = new SpeechSynthesisUtterance(limpio);
  
  const voz = obtenerVozFemenina();

  if(voz){
    speech.voice = voz;
  }
  speech.lang = "es-ES";
  speech.rate = 0.95;
  speech.pitch = 3.15;
  speech.volume = 1;

  speaking = true;
  if(onStart){
    onStart();
  }

  speech.onend = () => {
    speaking = false;
    
    if(onEnd){
      onEnd();
    }
  };

  speech.onerror = () => {
    speaking = false;
  if(onEnd){
    onEnd();
  }
  
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