type MessageProps = {
  texto: string;
  autor: string;
};

function Message({ texto, autor }: MessageProps) {
  return (
    <p>
      <strong>{autor}</strong>
      <br />
      {texto}
    </p>
  );
}

export default Message;