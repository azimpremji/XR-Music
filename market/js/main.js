console.log("Welcome!")

const PUBLIC_SERVER = "wss://xls20-sandbox.rippletest.net:51233"
const client = new xrpl.Client(PUBLIC_SERVER)
client.connect()



async function acceptSellOffer(wallet,index) {

  const transactionBlob = {
    "TransactionType": "NFTokenAcceptOffer",
    "Account": wallet.classicAddress,
    "SellOffer": index,
  }

  const tx = await client.submitAndWait(transactionBlob,{wallet})
  return tx.result.meta.TransactionResult; 
}

let handle_buy = async (index, tokenid)=>{

  if(!window.xrp_wallet){
    SnackBar({
      message: "Please Connect Your Wallet First!",
      icon: "ℹ️",
      status: "info"
    })
    return;
  }

  $("#menu_loader_gif").show()
  
  let txRes = await acceptSellOffer(window.xrp_wallet, index)
  if(txRes=="tecCANT_ACCEPT_OWN_OFFER"){
    SnackBar({
      message: "You Can't Buy Your Own NFT!",
      icon: "exclamation",
      status: "danger"
    })
    $("#menu_loader_gif").hide()
    return;
  }

  if(txRes!="tesSUCCESS"){
    SnackBar({
      message: "Unable to buy check your wallet balance!",
      icon: "exclamation",
      status: "danger"
    })
    console.log(txRes)
    $("#menu_loader_gif").hide()
    return;
  }
  console.log('here')
  await fetch('https://xrpnftt.herokuapp.com/nftbought',{
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({  
      "contract_token_id": `.${tokenid}`,
      "ownerid": window.xrp_wallet.classicAddress
    })
  })

  window.location.reload()
}


async function list_items(){
  $("#menu_loader_gif").show()
  let response = [];
  let req = await fetch('https://xrpnftt.herokuapp.com/nft')
  let res = await req.json()
  /*  let response = [
    {'token_id':'0','id':'poly.factory.nftmarketplace.testnet','name':'test','short_description':'test','price':'1','music':'http://127.0.0.1:5500/temp/Caller_Tune_Humshakals_Saif_Ali_(getmp3.pro).mp3','gif':'','theme':'t1' },
    {'token_id':'0','id':'poly.factory.nftmarketplace.testnet','name':'test','short_description':'test','price':'1','music':'http://127.0.0.1:5500/temp/Caller_Tune_Humshakals_Saif_Ali_(getmp3.pro).mp3','gif':'','theme':'t2'}
  ];*/
  console.log(res)
  for(let v of res){
    try{
      let obj ={};
      obj['token_id']=v['tokenid'];
      obj['id']=v['contractid'];
      obj['price']=v['price']
      obj['ownerid'] = v['ownerid']
      obj['offer'] = v['offer']
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

  let s='';

  for(let i of response){
    let a= '<div  class="menu_item">'
    a+= `<img onclick="window.open('${window.location.origin}/themes/${i['theme']}/?music=${btoa(i['music'])}');" src="${i['gif']}">`
    a+= '<div style="display: flex; flex-direction: column; margin-top: 15px;">'
    a+= `<span style="color: #0ff; font-family:cursive; font-weight: bold; font-size: medium;">${i['name']}</span>`
    a+= `<span style="color: white; font-family:cursive">${i['short_description']}</span>`
    a+= `<span style="color: white;font-family:cursive">${i['price']} XRP</span>`
    a+= '</div>'
    a+=  `<button class="login" style="margin-top: 10px;" onclick="handle_buy('${i['offer']}','${i['token_id']}')">Buy</button>`
    a+= '</div>'
    s+= a;
  }
  $("#items_menu").append(s)
  $("#menu_loader_gif").hide()
}

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
      $("#bal_div").css("display","flex");
      $("#mybal").text(`${Number(response.result.account_data.Balance/1000000).toFixed(2)} XRP`)
    }catch(e){

    }
  })
}

async function useAccOld(secret){
  const test_wallet = xrpl.Wallet.fromSeed(secret) // Test secret; don't use for real
  return test_wallet;
}

$(document).ready(()=>{
  (async()=>{
    let xrp_wallet = window.localStorage.getItem("xrp_wallet")
    if(xrp_wallet){
      window.xrp_wallet = await useAccOld(xrp_wallet);
      getbalance()
    }
    list_items();
  })()
});

