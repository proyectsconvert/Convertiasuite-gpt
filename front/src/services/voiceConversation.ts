import {hablar} from "@/services/voice";

class VoiceConversation{
    private onSend?: (text:string) =>Promise<void>;
    private conversationActive =false;
    private assistantSpeaking = false;
    private onSpeakingChnage?  : (speaking : boolean) => void;
    
    registerSpeakingListener(
        listener :(speaking:boolean) =>  void
    ){
        this.onSpeakingChnage = listener;
    }

    registerSendhandler(
        handler :(text:string) =>Promise<void>
    ){
        this.onSend = handler;
    }
    start(){
        this.conversationActive= true;
        console.log("cConversación iniciada")
    }
    stop(){
        this.conversationActive = false;
        console.log("Conversación detenidad");
    }
    isConversationActive(){
        return this.conversationActive;
    }
    async send(text: string){
        if(!this.onSend){
            console.warn("No hay manejador de envio registrado");
            return;
        }
        await this.onSend(text);
    }
    async speak(text:string){
        if (!this.conversationActive) {
            console.log("Se omite la voz porque la conversación no está activa");
            return;
        }

        hablar(
            text,
            () => this.onAssistantStart(),
            () => this.onAssistantEnd(),
        );
    }
    onAssistantStart(){
        this.assistantSpeaking = true;
        this.onSpeakingChnage?.(true);
        console.log("La IA empezo a hablar")
    }
    onAssistantEnd(){
        this.assistantSpeaking = false;
        this.onSpeakingChnage?.(false);
        console.log("La IA terminó de hablar")
    }

}
export const voiceConversation = new VoiceConversation();