console.log("Welcome!")

const PUBLIC_SERVER = "wss://xls20-sandbox.rippletest.net:51233"
const client = new xrpl.Client(PUBLIC_SERVER)
client.connect()

let gif_cid = null;
let current_music= null;
let current_theme=null;
let current_tokenid=null;
let current_contractid=null;

function dropHandler(ev) {
    console.log('File(s) dropped');
  
    // Prevent default behavior (Prevent file from being opened)
    ev.preventDefault();
  
    if (ev.dataTransfer.items) {
      // Use DataTransferItemList interface to access the file(s)
      for (var i = 0; i < ev.dataTransfer.items.length; i++) {
        // If dropped items aren't files, reject them
        if (ev.dataTransfer.items[i].kind === 'file') {
          var file = ev.dataTransfer.items[i].getAsFile();
          let ext = (file.name).split(".").pop() 
          if(ext=="mp3"){
            $("#drop_music_span").text(file.name)
            console.log('... file[' + i + '].name = ' + file.name);

            const reader = new FileReader();
            reader.addEventListener("load", function () {
              let x = document.createElement("IFRAME");
              x.style.height ="80%";
              x.style.width ="80%";
              x.id="rcd_frame"
              let themes = ["t1","t2","t3"]
              let theme = themes[Math.floor(Math.random() * themes.length)];
              x.src = `${window.location.origin}/themes/${theme}/?music=record&record=true`;
              $("#record_frame").append(x) 
              $("#record_frame").css("display", "flex");
              x.onload= ()=> {
                  console.log('Iframe Loaded!')
                  x.contentWindow.postMessage({call:'sendFile', value:reader.result });
                  current_music = reader.result;
                  current_theme = theme;
               };
              
            }, false);
            reader.readAsDataURL(file);
            
          }
          
        }
      }
    } else {
      // Use DataTransfer interface to access the file(s)
      for (var i = 0; i < ev.dataTransfer.files.length; i++) {
        let ext = (ev.dataTransfer.files[i].name).split(".").pop()
        if(ext=="mp3"){ 
            $("#drop_music_span").text(ev.dataTransfer.files[i].name)
            console.log('... file[' + i + '].name = ' + ev.dataTransfer.files[i].name);
        }
      }
    }
}

function dragOverHandler(ev) {
    console.log('File(s) in drop zone');
    // Prevent default behavior (Prevent file from being opened)
    ev.preventDefault();
}


async function sellnft(tokenid,amount){
  amount=amount*1000000;
  let wallet = window.xrp_wallet;
  const transactionBlob = {
    "TransactionType": "NFTokenCreateOffer",
    "Account": wallet.classicAddress,
    "TokenID": tokenid,
    "Amount": String(amount),
    "Flags": parseInt("1")
}

  const tx = await client.submitAndWait(transactionBlob,{wallet})
  console.log(tx)
}

$("#submit_sell").click(async ()=>{
  $("#nft_amount").attr('disabled','disabled')
  $("#submit_sell").hide()
  $("#sell_loader_gif").show()
  let price = parseInt($("#nft_amount").val())
  if(price<=0){
    SnackBar({
      message: "Sell price should be greater then zero!",
      icon: "exclamation",
      status: "danger"
    })
  }

  await sellnft(current_tokenid,price);
  let nftSellOffers;
  try {
      nftSellOffers = await client.request({
      method: "nft_sell_offers",
      tokenid: current_tokenid  
    })
    nftSellOffers = (nftSellOffers['result']['offers'].pop())['index']
    console.log(nftSellOffers)
  } catch (err) {
    SnackBar({
      message: "Error! Please Try Again.",
      icon: "exclamation",
      status: "danger"
    })
    console.error("No sell offers.")
    return;
  }

  if(!nftSellOffers){
    SnackBar({
      message: "Not Able To Put On Sell. Check Your Wallet Balance!",
      icon: "exclamation",
      status: "danger"
    })
    return;
  }

  await fetch('https://xrpnftt.herokuapp.com/nftsale',{
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      "contract_token_id": `.${current_tokenid}`, 
      "price": $("#nft_amount").val(),
      "offer": nftSellOffers
    })
  })
  window.location.reload()
})

let handle_set_for_sell = async (token_id,contract_id)=>{
  current_tokenid=token_id;
  current_contractid=contract_id;
  $("#ppopup").css("display","flex");
}

async function cancelnft(index,wallet){
  const tokenIDs = [index]

    const transactionBlob = {
        "TransactionType": "NFTokenCancelOffer",
       "Account": wallet.classicAddress,
       "TokenIDs": tokenIDs
    }
    const tx = await client.submitAndWait(transactionBlob,{wallet})
}

let handle_unset_for_sell = async (index, tokenid)=>{
  $("#menu_loader_gif").show()
  await cancelnft(index, window.xrp_wallet);
  let rx = await fetch('https://xrpnftt.herokuapp.com/remsale',{
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      "contract_token_id": `.${tokenid}`
    })
  })
  if(!(await rx.json())['success']){
    SnackBar({
      message: "Sorry, Technical Error Try Again!",
      icon: "exclamation",
      status: "danger"
    })
    return;
  }
  window.location.reload()
}

let lock_mint_ui = ()=>{
  $("#music_name").attr('disabled','disabled')
  $("#short_description").attr('disabled','disabled')
  $("#submit_music").hide()
  $("#loader_gif").show()
}
let unlock_mint_ui = ()=>{
  $("#music_name").removeAttr('disabled','disabled')
  $("#short_description").removeAttr('disabled','disabled')
  $("#loader_gif").hide()
  $("#submit_music").show()
}


async function mintNft(uri,wallet,id){
  const transactionBlob = {
    TransactionType: "NFTokenMint",
    Account: wallet.classicAddress,
    URI: xrpl.convertStringToHex(uri),
    Flags: parseInt("8"),
    TokenTaxon: id
  }
  console.log("SUbmitting tx");
  const tx = await client.submitAndWait(transactionBlob,{wallet})
  console.log(tx);
  const nfts = await client.request({
    method: "account_nfts",
    account: wallet.classicAddress  
  })
  console.log(nfts)
  for(let nft of nfts.result.account_nfts){
    if(nft.TokenTaxon==id){
      return nft.TokenID;
    }
  }
}

$("#submit_music").click(async ()=>{

  lock_mint_ui()

  /*---------------------------*/
  if(!window.xrp_wallet){
    SnackBar({
      message: "Please Connect Your Wallet First!",
      icon: "exclamation",
      status: "danger"
    })
    return;
  }
  /*-----------------------------*/


  if(!current_music){
    SnackBar({
      message: "Please Drop Your Music First!",
      icon: "exclamation",
      status: "danger"
    })
    unlock_mint_ui()
    return;
  }
  if(!gif_cid){
    SnackBar({
      message: "Please Wait For ART Generation!",
      icon: "exclamation",
      status: "danger"
    })
    unlock_mint_ui()
    return;
  }
  let name = $("#music_name").val()
  let short_description = $("#short_description").val()

  if(!name){
    SnackBar({
      message: "Please Fill The Name Field!",
      icon: "exclamation",
      status: "danger"
    })
    unlock_mint_ui()
    return;
  }

  if(!short_description){
    SnackBar({
      message: "Please Fill The Short Description Field!",
      icon: "exclamation",
      status: "danger"
    })
    unlock_mint_ui()
    return;
  }


  SnackBar({
    message: "Uploading Music To IPFS.",
    icon: "ℹ️",
    status: "info"
  })

  let music_cid = await window.uploadW3s([new File([dataURItoBlob(current_music)], makeid(6))]);
  console.log(`Music cid: ${music_cid}`)

  SnackBar({
    message: "Music Sucessfully Uploaded To IPFS.",
    icon: "✅",
    status: "success"
  })

  SnackBar({
    message: "Uploading MetaData To IPFS.",
    icon: "ℹ️",
    status: "info"
  })

  const metadata_file = new File([new Blob([`{"music": "https://${music_cid}.ipfs.infura-ipfs.io/","theme":"${current_theme}", "gif": "https://${gif_cid}.ipfs.infura-ipfs.io/", "name":"${name}", "short_description":"${short_description}"}`], {
    type: 'text/plain'
  })], 'metadata.json', {
    type: "application/json"
  });

  let metadata_cid = await window.uploadW3s([metadata_file]);
  console.log(`Metadata cid: ${metadata_cid}`)

  SnackBar({
    message: "MetaData Sucessfully Uploaded To IPFS.",
    icon: "✅",
    status: "success"
  })
  SnackBar({
    message: "Making Transaction To Mint NFT.",
    icon: "ℹ️",
    status: "info"
  })
 
  /*---------------------------*/
    try{
      let tID = await mintNft(`https://${metadata_cid}.ipfs.infura-ipfs.io/`,window.xrp_wallet, Math.floor((Math.random() * 1000000) + 1));
      console.log(tID)
      if(!tID){
        SnackBar({
          message: "Sorry, Technical Error Try Again!",
          icon: "exclamation",
          status: "danger"
        })
        unlock_mint_ui()
        return;
      }

      let rx = await fetch('https://xrpnftt.herokuapp.com/nft',{
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          "contractid": ``,
          "tokenid": tID,
          "metadata": `https://${metadata_cid}.ipfs.infura-ipfs.io/`,
          "ownerid": window.xrp_wallet.classicAddress
        })
      })
      if(!(await rx.json())['success']){
        SnackBar({
          message: "Sorry, Technical Error Try Again!",
          icon: "exclamation",
          status: "danger"
        })
        unlock_mint_ui()
        return;
      }
    }catch(e){
      console.error(e)
      SnackBar({
        message: "Sorry, Technical Error Try Again!",
        icon: "exclamation",
        status: "danger"
      })
      unlock_mint_ui()
      return;
    }
  /*---------------------------*/

  current_music=null;
  current_theme=null;
  gif_cid=null;

  
  SnackBar({
    message: "Congratulations Minting Completed!",
    icon: "✅",
    status: "success"
  })
  

  $("#drop_music_span").text("Drop Music Here")
  $("#music_name").val('')
  $("#short_description").val('')
  $("#gif_holder").hide()

  unlock_mint_ui()
  setTimeout(()=>{
    window.location.reload()
  },600)
})

 function makeid(length) {
  var result           = '';
  var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
    result += characters.charAt(Math.floor(Math.random() * 
charactersLength));
 }
 return result;
}


 function dataURItoBlob(dataURI) {
  // convert base64 to raw binary data held in a string
  // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
  var byteString = atob(dataURI.split(',')[1]);

  // separate out the mime component
  var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

  // write the bytes of the string to an ArrayBuffer
  var ab = new ArrayBuffer(byteString.length);
  var ia = new Uint8Array(ab);
  for (var i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeString });
}


 window.addEventListener("message", async (event)=>{
  const message = event.data.message;
  switch (message) {
    case 'gifResult':
      
      $("#record_frame").empty()
      $("#record_frame").hide()

      $("#submit_music").hide()
      $("#loader_gif").show()

      let url = event.data.value;

      $("#gif_holder_img").attr("src",url);
      $("#gif_holder").css("display","flex");
      
      SnackBar({
        message: "ART Generated.",
        icon: "✅",
        status: "success"
      })
      SnackBar({
        message: "Uploading ART To IPFS.",
        icon: "ℹ️",
        status: "info"
      })
      gif_cid = await window.uploadW3s([new File([dataURItoBlob(url)], makeid(6))]);
      console.log(`Gif cid: ${gif_cid}`)
      SnackBar({
        message: "ART Sucessfully Uploaded To IPFS.",
        icon: "✅",
        status: "success"
      })
      $("#submit_music").show()
      $("#loader_gif").hide()
      break;
  }
 }, false);



async function list_items(){

  $("#menu_loader_gif").show()

  
  let response = [];
  let req = await fetch('https://xrpnftt.herokuapp.com/nftid',{
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({  
      "ownerid": window.xrp_wallet.classicAddress
    })
  })
  let res = await req.json()
  /*  let response = [
    {'token_id':'0','id':'poly.factory.nftmarketplace.testnet','name':'test','short_description':'test','price':'1','music':'http://127.0.0.1:5500/temp/Caller_Tune_Humshakals_Saif_Ali_(getmp3.pro).mp3','gif':'','theme':'t1' },
    {'token_id':'0','id':'poly.factory.nftmarketplace.testnet','name':'test','short_description':'test','price':'1','music':'http://127.0.0.1:5500/temp/Caller_Tune_Humshakals_Saif_Ali_(getmp3.pro).mp3','gif':'','theme':'t2'}
  ];*/
  //console.log(res)
  for(let v of res){
    try{
      let obj ={};
      obj['token_id']=v['tokenid'];
      obj['id']=v['contractid'];
      obj['price']=v['price']
      obj['on_sell']=v['isonsale']
      obj['offer']=v['offer']
      console.log(v['metadata'])
      let req1 = await fetch(v['metadata'])
      let res1 = await req1.json()
      
      obj['music']=res1['music']
      obj['theme'] = res1['theme']
      obj['gif'] = res1['gif']
      obj['short_description'] = res1['short_description']
      obj['name'] = res1['name']

      response.push(obj)
    }catch(e){
      console.error(e)
    }
  }


  console.log(response)
  let s='';

  for(let i of response){
    let a= '<div class="menu_item">'
    a+= `<img onclick="window.open('${window.location.origin}/themes/${i['theme']}/?music=${btoa(i['music'])}');" src="${i['gif']}">`
    a+= '<div style="display: flex; flex-direction: column; margin-top: 15px;">'
    a+= `<span style="color: #0ff; font-family:cursive; font-weight: bold; font-size: medium;">${i['name']}</span>`
    a+= `<span style="color: white; font-family:cursive">${i['short_description']}</span>`
    a+= i['on_sell']?`<span style="color: white;font-family:cursive">${i['price']} XRP</span>`:`<span style="color: white;font-family:cursive">Not On Sell</span>`
    a+= '</div>'
    a+=  i['on_sell']?`<button class="login" style="margin-top: 10px;" onclick="handle_unset_for_sell('${i['offer']}','${i['token_id']}')">Unlist</button>`:`<button class="login" style="margin-top: 10px;" onclick="handle_set_for_sell('${i['token_id']}','${i['id']}')">Sell</button>`
    a+= '</div>'
    s+= a;
  }

  $("#items_menu").append(s)
  $("#menu_loader_gif").hide()
}



async function wait_for_seq(network_url, address) {
  const api = new xrpl.Client(network_url)
  await api.connect()
  let response;
  while (true) {
    try {
      response = await api.request({
        command: "account_info",
        account: address,
        ledger_index: "validated"
      })
      break
    } catch(e) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }
  console.log(response)
  api.disconnect()
}

async function useAccOld(secret){
  const test_wallet = xrpl.Wallet.fromSeed(secret) // Test secret; don't use for real
  return test_wallet;
}

async function generateAccNew(){
  const rawResponse = await fetch('https://faucet-nft.ripple.com/accounts', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
   
  });

  const content = await rawResponse.json();
  console.log(content)
  const test_wallet = xrpl.Wallet.fromSeed(content.account.secret) // Test secret; don't use for real

  await wait_for_seq(PUBLIC_SERVER,test_wallet.classicAddress)
  return [test_wallet,content.account.secret]
}


const signIn = () => {
  $("#ppopup_connect").css("display","flex")
};

$("#acc_connect").click(()=>{
  signIn();
})

$("#import_wallet").click(()=>{
  $("#ppopup_connect_imp").css("display","flex");
  $("#ppopup_connect_btn").hide();
  $("#acc_connect").hide()
})

$("#submit_seed").click(async ()=>{
  let seed = $("#seed_inp").val()
  if(seed){
    try{
      $("#wallet_loader_gif").show()
      let wallet = await useAccOld(seed)
      window.xrp_wallet = wallet;
   
      window.localStorage.setItem("xrp_wallet", seed)
      $("#ppopup_connect").hide();
      $("#ppopup_connect_imp").hide();
      $("#ppopup_connect_crt").hide();
      $("#ppopup_connect_btn").css("display","flex");
      $("#wallet_loader_gif").hide()
      list_items()
      getbalance()
      $("#hi_acc").show()
      $("#hi_acc").text(`Hi, ${window.xrp_wallet.classicAddress}`)
    }catch(e){
      SnackBar({
        message: "Invalid Seed!",
        icon: "exclamation",
        status: "danger"
      })
    }
  }else{
    SnackBar({
      message: "Please provide seed phrase!",
      icon: "exclamation",
      status: "danger"
    })
  }
})

$("#create_wallet").click(async ()=>{
  $("#wallet_loader_gif").show()
  $("#ppopup_connect_btn").hide();
  $("#acc_connect").hide()
  SnackBar({
    message: "Please wait generating your wallet!",
    icon: "ℹ️",
    status: "info"
  })
  let res = await generateAccNew()
  window.xrp_wallet = res[0]
  window.localStorage.setItem("xrp_wallet", res[1])
  
  if(!window.xrp_wallet){
    $("#acc_connect").show()
    $("#ppopup_connect").hide()
    SnackBar({
      message: "Sorry, Technical Error Try Again!",
      icon: "exclamation",
      status: "danger"
    })
  }
  $("#hi_acc").show()
  $("#hi_acc").text(`Hi, ${window.xrp_wallet.classicAddress}`)
  list_items()
  getbalance()
  $("#ur_seed_phrase").val(res[1]); 
  $("#ppopup_connect_crt").css("display","flex");
  $("#wallet_loader_gif").hide()
})

$("#copy_seed").click(()=>{
  navigator.clipboard.writeText($("#ur_seed_phrase").val());
  SnackBar({
    message: "Seed Copied!",
    icon: "✅",
    status: "success"
  })
  $("#ppopup_connect").hide();
  $("#ppopup_connect_imp").hide();
  $("#ppopup_connect_crt").hide();
  $("#ppopup_connect_btn").css("display","flex");
})

async function getbalance(){
  let wallet = window.xrp_wallet;
  let ivx = setInterval(async ()=>{
    if(client.isConnected()){
      clearInterval(ivx)
    }
    try{
      const response = await client.request({
        "command": "account_info",
        "account": wallet.address,
        "ledger_index": "validated"
      })
      $("#bal_val_span").text(`${Number(response.result.account_data.Balance/1000000).toFixed(2)} XRP`)
    }catch(e){

    }
  })
}

$(document).ready(()=>{
  (async ()=>{
    $("#acc_connect").hide()
    let xrp_wallet = window.localStorage.getItem("xrp_wallet")
    if(xrp_wallet){
      window.xrp_wallet = await useAccOld(xrp_wallet);
      $("#hi_acc").show()
      $("#hi_acc").text(`Hi, ${window.xrp_wallet.classicAddress}`)
      $("#menu_").css("display","flex");
      list_items()
      getbalance()
    }else{
      $("#acc_connect").show()
    }
  })()
});