import MessageComponent from "./Message";
import type { Message } from "../types/Message";
type ConversationProps={
    mensajes: Message[];
    
}


function Conversation({ mensajes}: ConversationProps){
    return (
    <section>
     <h2> Conversacón</h2>
      {mensajes.map((mensaje,index) => (
        <MessageComponent
        key={index}
        texto={mensaje.texto}
        autor={mensaje.autor}
        />
      ))}

        </section>
    );
}

export default Conversation;