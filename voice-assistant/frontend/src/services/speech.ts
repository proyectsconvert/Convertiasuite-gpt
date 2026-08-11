export function iniciarReconocimiento(
    onTexto: (texto: string) =>void
){
    const SpeechRecognition =
    (window as any) .SpeechRecognition ||
    (window as any).webkitSpeechRecognition;
    if(!SpeechRecognition){
        alert("Tu navegador no soporta reconocimiento de voz.");
        return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "es-ES";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.start();
    recognition.onstart = () =>{
        console.log("Escuchando");
    };
   recognition.onresult=(event:any) =>{
    const texto = event.results [0][0].transcript;
    onTexto(texto);
   };
   recognition.onerror = (event:any) =>{
    console.error(event.error);
   };
   recognition.onend = () => {
    console.log("Reconocimiento finalizado");
   };
   
}