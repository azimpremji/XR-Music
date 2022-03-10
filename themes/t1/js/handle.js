let url_string = window.location.href;
let url = new URL(url_string);
let c = url.searchParams.get("music");
let rc = url.searchParams.get("record");
let music_url;
if(c){
    music_url = atob(c);
    console.log('lol')
    AudioHandler.setCallBack(()=>{
        console.log('wox')
        $("#wsx").click(()=>{
            $("#btx").hide()
            AudioHandler.playHandle(music_url)
            if(rc){
                setTimeout(()=>{
                    let _canvas = $("#webgl").children('canvas')[0]
                    let _stream = _canvas.captureStream(25);
                    gifshot.createGIF({
                    'cameraStream': _stream,
                    'numFrames': 30
                    },function(obj) {
                        if(!obj.error) {
                            var image = obj.image;
                            window.parent.postMessage({ message: "gifResult", value: image }, "*");
                            //console.log(image);
                        }
                    });
                },1500)
            }
        })
    })
}   

window.addEventListener("message", (event)=>{
    const message = event.data;
    console.log('Message Recived!')
    switch (message.call) {
      case 'sendFile':
        music_url = event.data.value;
        console.log('Data passed!')
        break;
    }
}, false);

