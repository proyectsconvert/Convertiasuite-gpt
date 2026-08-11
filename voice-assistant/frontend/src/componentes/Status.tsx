type StatusProps ={
    estado : string

}
function Status({estado}:StatusProps){
    return(
        <p>{estado}</p>
    )
}

export default Status